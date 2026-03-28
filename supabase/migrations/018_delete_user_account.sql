-- Funcion RPC para que el usuario elimine su propia cuenta
-- Debe ejecutarse en el SQL Editor de Supabase

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _phone text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Obtener el telefono del usuario para limpiar datos relacionados
  SELECT raw_user_meta_data->>'phone' INTO _phone
  FROM auth.users
  WHERE id = _uid;

  -- Cancelar pedidos pendientes
  IF _phone IS NOT NULL THEN
    UPDATE public.orders
    SET status = 'CANCELLED',
        cancelled_at = NOW(),
        cancelled_by = 'client'
    WHERE client_phone = _phone
      AND status = 'PENDING';
  END IF;

  -- Eliminar ratings del usuario
  DELETE FROM public.ratings WHERE user_id = _uid;

  -- Eliminar el usuario de auth.users (cascade eliminara el perfil si hay trigger)
  DELETE FROM auth.users WHERE id = _uid;
END;
$$;

-- Solo usuarios autenticados pueden llamar esta funcion
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
