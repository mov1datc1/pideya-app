BEGIN;
CREATE TABLE IF NOT EXISTS public.client_addresses (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 100),
  address_text text NOT NULL CHECK (length(trim(address_text)) BETWEEN 1 AND 1000),
  reference text,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  is_default boolean NOT NULL DEFAULT false,
  is_pin_location boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (latitude <> 0 OR longitude <> 0)
);
CREATE INDEX IF NOT EXISTS client_addresses_user_idx ON public.client_addresses(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS client_addresses_one_default_idx ON public.client_addresses(user_id) WHERE is_default;
ALTER TABLE public.client_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS client_addresses_owner ON public.client_addresses;
CREATE POLICY client_addresses_owner ON public.client_addresses TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
REVOKE ALL ON public.client_addresses FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_addresses TO authenticated;

CREATE OR REPLACE FUNCTION public.save_client_address(p_address jsonb)
RETURNS public.client_addresses LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_id text := coalesce(nullif(p_address->>'id', ''), gen_random_uuid()::text);
  v_default boolean := coalesce((p_address->>'is_default')::boolean, false);
  v_result public.client_addresses;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  IF v_default THEN UPDATE public.client_addresses SET is_default = false, updated_at = now() WHERE user_id = v_user AND is_default AND id <> v_id; END IF;
  INSERT INTO public.client_addresses (id,user_id,label,address_text,reference,latitude,longitude,is_default,is_pin_location)
  VALUES (v_id,v_user,trim(p_address->>'label'),trim(p_address->>'address_text'),p_address->>'reference',(p_address->>'latitude')::double precision,(p_address->>'longitude')::double precision,v_default,coalesce((p_address->>'is_pin_location')::boolean,true))
  ON CONFLICT (id) DO UPDATE SET label=excluded.label,address_text=excluded.address_text,reference=excluded.reference,latitude=excluded.latitude,longitude=excluded.longitude,is_default=excluded.is_default,is_pin_location=excluded.is_pin_location,updated_at=now()
  RETURNING * INTO v_result;
  RETURN v_result;
END;
$$;
CREATE OR REPLACE FUNCTION public.set_default_client_address(p_id text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text,0));
  IF NOT EXISTS (SELECT 1 FROM public.client_addresses WHERE id=p_id AND user_id=v_user) THEN RAISE EXCEPTION 'Address not found'; END IF;
  UPDATE public.client_addresses SET is_default=false,updated_at=now() WHERE user_id=v_user AND is_default;
  UPDATE public.client_addresses SET is_default=true,updated_at=now() WHERE user_id=v_user AND id=p_id;
END;
$$;
REVOKE ALL ON FUNCTION public.save_client_address(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_default_client_address(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_client_address(jsonb), public.set_default_client_address(text) TO authenticated;
COMMIT;
