-- First create your own account in Supabase Authentication > Users > Add user.
-- Replace YOUR_OWNER_EMAIL before running this in the URC SQL Editor.
DO $owner$
DECLARE owner_id uuid;
BEGIN
 SELECT id INTO owner_id FROM auth.users WHERE lower(email)=lower('YOUR_OWNER_EMAIL');
 IF owner_id IS NULL THEN RAISE EXCEPTION 'Create the Auth user first, then replace YOUR_OWNER_EMAIL with your exact email.'; END IF;
 INSERT INTO public.urc_team(user_id,display_name,role)
 VALUES(owner_id,'URC owner','owner')
 ON CONFLICT(user_id) DO UPDATE SET role='owner';
END $owner$;
