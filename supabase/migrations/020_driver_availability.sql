-- ============================================================
-- Migración 020: Toggle Disponibilidad + Regla 1 pedido activo
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ============================================================

-- 1. Nuevos campos en driver_profiles
ALTER TABLE driver_profiles
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS available_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

-- Índice para buscar drivers disponibles por restaurante
CREATE INDEX IF NOT EXISTS idx_driver_profiles_available
  ON driver_profiles(restaurant_id, is_available)
  WHERE is_available = true AND is_active = true;

-- 2. RPC: Toggle disponibilidad del repartidor
CREATE OR REPLACE FUNCTION public.driver_toggle_available(
  p_access_token TEXT,
  p_available BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id UUID;
  v_current_order UUID;
BEGIN
  -- Validar token
  SELECT id, current_order_id INTO v_driver_id, v_current_order
  FROM driver_profiles
  WHERE access_token = p_access_token AND is_active = true;

  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Token inválido o repartidor inactivo';
  END IF;

  -- No puede desactivarse si tiene entrega en curso
  IF p_available = false AND v_current_order IS NOT NULL THEN
    RAISE EXCEPTION 'No puedes desactivarte con una entrega en curso';
  END IF;

  UPDATE driver_profiles
  SET
    is_available = p_available,
    available_since = CASE
      WHEN p_available = true THEN NOW()
      ELSE NULL
    END
  WHERE id = v_driver_id;

  RETURN json_build_object(
    'driver_id', v_driver_id,
    'is_available', p_available
  );
END;
$$;

-- 3. Modificar driver_take_order para validar regla de 1 pedido activo
--    y setear current_order_id
DROP FUNCTION IF EXISTS public.driver_take_order(TEXT, UUID);
CREATE OR REPLACE FUNCTION public.driver_take_order(
  p_access_token TEXT,
  p_order_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id UUID;
  v_driver_name TEXT;
  v_current_order UUID;
  v_order_status TEXT;
BEGIN
  -- Validar token
  SELECT id, name, current_order_id INTO v_driver_id, v_driver_name, v_current_order
  FROM driver_profiles
  WHERE access_token = p_access_token AND is_active = true;

  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Token inválido o repartidor inactivo';
  END IF;

  -- Regla: solo 1 pedido ON_THE_WAY a la vez
  IF v_current_order IS NOT NULL THEN
    RAISE EXCEPTION 'Ya tienes una entrega en curso. Complétala antes de iniciar otra.';
  END IF;

  -- Verificar que el pedido está asignado a este driver y en ACCEPTED
  SELECT status INTO v_order_status
  FROM orders
  WHERE id = p_order_id AND delivery_driver_id = v_driver_id;

  IF v_order_status IS NULL THEN
    RAISE EXCEPTION 'Pedido no encontrado o no asignado a ti';
  END IF;

  IF v_order_status <> 'ACCEPTED' THEN
    RAISE EXCEPTION 'El pedido no está en estado ACEPTADO (estado actual: %)', v_order_status;
  END IF;

  -- Actualizar pedido
  UPDATE orders
  SET
    status = 'ON_THE_WAY',
    delivery_started_at = NOW()
  WHERE id = p_order_id;

  -- Marcar current_order_id en el perfil del driver
  UPDATE driver_profiles
  SET current_order_id = p_order_id
  WHERE id = v_driver_id;

  RETURN json_build_object(
    'order_id', p_order_id,
    'driver_id', v_driver_id,
    'status', 'ON_THE_WAY'
  );
END;
$$;

-- 4. Función para completar entrega y limpiar current_order_id
CREATE OR REPLACE FUNCTION public.driver_complete_delivery(
  p_access_token TEXT,
  p_order_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id UUID;
  v_order_status TEXT;
  v_pending_count INT;
BEGIN
  -- Validar token
  SELECT id INTO v_driver_id
  FROM driver_profiles
  WHERE access_token = p_access_token AND is_active = true;

  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Token inválido o repartidor inactivo';
  END IF;

  -- Verificar que el pedido es del driver y está ON_THE_WAY
  SELECT status INTO v_order_status
  FROM orders
  WHERE id = p_order_id AND delivery_driver_id = v_driver_id;

  IF v_order_status IS NULL THEN
    RAISE EXCEPTION 'Pedido no encontrado o no asignado a ti';
  END IF;

  IF v_order_status <> 'ON_THE_WAY' THEN
    RAISE EXCEPTION 'El pedido no está en camino (estado actual: %)', v_order_status;
  END IF;

  -- Marcar como entregado
  UPDATE orders
  SET
    status = 'DELIVERED',
    delivered_at = NOW()
  WHERE id = p_order_id;

  -- Limpiar current_order_id
  UPDATE driver_profiles
  SET current_order_id = NULL
  WHERE id = v_driver_id;

  -- Contar pedidos pendientes
  SELECT COUNT(*) INTO v_pending_count
  FROM orders
  WHERE delivery_driver_id = v_driver_id
    AND status = 'ACCEPTED';

  RETURN json_build_object(
    'order_id', p_order_id,
    'status', 'DELIVERED',
    'pending_orders', v_pending_count
  );
END;
$$;

-- 5. RPC para obtener drivers disponibles (para el panel del restaurante)
CREATE OR REPLACE FUNCTION public.get_available_drivers(
  p_restaurant_id UUID
)
RETURNS SETOF JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'id', dp.id,
    'name', dp.name,
    'phone', dp.phone,
    'vehicle_label', dp.vehicle_label,
    'is_available', dp.is_available,
    'available_since', dp.available_since,
    'current_order_id', dp.current_order_id,
    'active_orders', (
      SELECT COUNT(*)
      FROM orders o
      WHERE o.delivery_driver_id = dp.id
        AND o.status IN ('ACCEPTED', 'ON_THE_WAY')
    )
  )
  FROM driver_profiles dp
  WHERE dp.restaurant_id = p_restaurant_id
    AND dp.is_active = true
  ORDER BY dp.is_available DESC, dp.name;
$$;
