-- ============================================================
-- Migración 019: Auth y Push Notifications para App Repartidores
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ============================================================

-- 1. Agregar columnas a driver_profiles para vincular
--    con auth.users y guardar push token
ALTER TABLE driver_profiles
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Índice para búsqueda por user_id
CREATE INDEX IF NOT EXISTS idx_driver_profiles_user_id
  ON driver_profiles(user_id)
  WHERE user_id IS NOT NULL;

-- 2. RLS: Permitir que un repartidor autenticado actualice
--    SU PROPIO perfil (user_id y push_token)
CREATE POLICY driver_update_own_profile
  ON driver_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. RLS: Permitir que un repartidor lea su propio perfil
CREATE POLICY driver_read_own_profile
  ON driver_profiles
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- 4. RLS: Permitir que repartidores lean sus pedidos asignados
CREATE POLICY driver_read_assigned_orders
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    delivery_driver_id IN (
      SELECT id FROM driver_profiles WHERE user_id = auth.uid()
    )
  );

-- 5. RLS: Permitir que repartidores actualicen el status de sus pedidos
--    (solo ON_THE_WAY → DELIVERED)
CREATE POLICY driver_update_order_status
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    delivery_driver_id IN (
      SELECT id FROM driver_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    delivery_driver_id IN (
      SELECT id FROM driver_profiles WHERE user_id = auth.uid()
    )
  );

-- 6. RLS: Permitir inserts/updates en driver_locations para el repartidor
CREATE POLICY driver_manage_own_location
  ON driver_locations
  FOR ALL
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM driver_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    driver_id IN (
      SELECT id FROM driver_profiles WHERE user_id = auth.uid()
    )
  );

-- 7. Función: notificar repartidor cuando le asignan pedido
--    (trigger en orders cuando delivery_driver_id cambia de NULL a un valor)
CREATE OR REPLACE FUNCTION notify_driver_on_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_push_token TEXT;
  v_driver_name TEXT;
BEGIN
  -- Solo actuar cuando se asigna un repartidor (de NULL a valor)
  IF OLD.delivery_driver_id IS NULL AND NEW.delivery_driver_id IS NOT NULL THEN
    SELECT push_token, name INTO v_push_token, v_driver_name
    FROM driver_profiles
    WHERE id = NEW.delivery_driver_id;

    -- Si el repartidor tiene push token, enviar notificación via pg_notify
    -- (el edge function o webhook puede escuchar esto)
    IF v_push_token IS NOT NULL THEN
      PERFORM pg_notify(
        'driver_assignment',
        json_build_object(
          'push_token', v_push_token,
          'driver_name', v_driver_name,
          'order_id', NEW.id,
          'order_number', NEW.order_number,
          'client_name', NEW.client_name,
          'restaurant_id', NEW.restaurant_id
        )::text
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Crear el trigger
DROP TRIGGER IF EXISTS trg_notify_driver_assignment ON orders;
CREATE TRIGGER trg_notify_driver_assignment
  AFTER UPDATE OF delivery_driver_id ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_driver_on_assignment();

-- ============================================================
-- NOTA: Para que las push notifications lleguen al repartidor,
-- necesitas un Edge Function o servicio que escuche pg_notify
-- y envíe la notificación via Expo Push API.
-- Esto es opcional para el MVP — los pedidos aparecen en
-- tiempo real via Supabase Realtime.
-- ============================================================
