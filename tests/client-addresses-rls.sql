BEGIN;
INSERT INTO auth.users(id,email) VALUES ('a8e19990-5b42-4b78-a624-d7a886ea3b01','pideya-qa-a@example.invalid'),('a8e19990-5b42-4b78-a624-d7a886ea3b02','pideya-qa-b@example.invalid');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','a8e19990-5b42-4b78-a624-d7a886ea3b01',true);
SELECT id,label,is_default FROM public.save_client_address('{"id":"pideya-qa-casa","label":"Casa","address_text":"QA address","latitude":20.8167,"longitude":-102.7633,"is_default":true}');
SELECT id,label,is_default FROM public.save_client_address('{"id":"pideya-qa-trabajo","label":"Trabajo","address_text":"QA work","latitude":20.82,"longitude":-102.76,"is_default":true}');
DO $$ BEGIN IF (SELECT count(*) FROM public.client_addresses WHERE is_default) <> 1 THEN RAISE EXCEPTION 'Multiple defaults'; END IF; END $$;
SELECT set_config('request.jwt.claim.sub','a8e19990-5b42-4b78-a624-d7a886ea3b02',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.client_addresses) THEN RAISE EXCEPTION 'RLS data leak'; END IF;
 BEGIN PERFORM public.set_default_client_address('pideya-qa-casa'); RAISE EXCEPTION 'Foreign default accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'Address not found' THEN RAISE; END IF; END;
 BEGIN PERFORM public.save_client_address('{"id":"pideya-qa-casa","label":"Other","address_text":"QA","latitude":20,"longitude":-103}'); RAISE EXCEPTION 'Foreign overwrite accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','a8e19990-5b42-4b78-a624-d7a886ea3b01',true);
SELECT public.set_default_client_address('pideya-qa-casa');
DO $$ BEGIN IF (SELECT count(*) FROM public.client_addresses) <> 2 THEN RAISE EXCEPTION 'Cross-device read failed'; END IF; END $$;
SELECT 'PASS: cloud persistence, account isolation, default selection and foreign-write rejection' AS result;
ROLLBACK;
