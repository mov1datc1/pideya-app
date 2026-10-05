-- Tiendas represents supermarkets / abarrotes, not pharmacies.
-- Prepared locally; apply with the shared backend migrations before release.
BEGIN;
UPDATE public.app_categories
SET flow_type = 'picked'
WHERE name = 'Tiendas' AND flow_type = 'pharmacy';
COMMIT;
