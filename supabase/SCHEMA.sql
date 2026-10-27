-- URC's dedicated project only. Reviewed schema source; not applied to another site's database.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE TABLE public.urc_team (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 display_name text NOT NULL CHECK(length(display_name) BETWEEN 1 AND 80),
 role text NOT NULL CHECK(role IN ('owner','editor','checkin')),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.urc_team ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.urc_team FROM anon,authenticated;
GRANT SELECT ON public.urc_team TO authenticated;
GRANT ALL ON public.urc_team TO service_role;
CREATE POLICY own_team_identity ON public.urc_team FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));

CREATE FUNCTION private.urc_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT role FROM public.urc_team WHERE user_id=(SELECT auth.uid()) AND auth.uid() IS NOT NULL
$$;
REVOKE ALL ON FUNCTION private.urc_role() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.urc_role() TO authenticated;

CREATE TABLE public.urc_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kind text NOT NULL CHECK(kind IN ('event','album','recap','partner','page')),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 160),
 slug text NOT NULL CHECK(slug~'^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug)<=120),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 payload jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(payload)='object'),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 publish_requested boolean NOT NULL DEFAULT false,
 published_snapshot jsonb,
 has_unpublished_changes boolean NOT NULL DEFAULT true,
 created_by uuid REFERENCES auth.users(id), updated_by uuid REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(kind,slug)
);
CREATE INDEX urc_entries_browse ON public.urc_entries(kind,status,updated_at DESC);
ALTER TABLE public.urc_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.urc_entries FROM anon,authenticated;
-- The public cannot SELECT a draft payload, even on a previously published row.
GRANT SELECT(id,kind,status,published_snapshot,updated_at) ON public.urc_entries TO anon;
GRANT SELECT,INSERT,UPDATE ON public.urc_entries TO authenticated;
GRANT ALL ON public.urc_entries TO service_role;
CREATE POLICY read_published ON public.urc_entries FOR SELECT TO anon USING(status='published' AND published_snapshot IS NOT NULL);
CREATE POLICY team_read ON public.urc_entries FOR SELECT TO authenticated USING((SELECT private.urc_role()) IN ('owner','editor'));
CREATE POLICY team_insert ON public.urc_entries FOR INSERT TO authenticated WITH CHECK((SELECT private.urc_role()) IN ('owner','editor'));
CREATE POLICY team_update ON public.urc_entries FOR UPDATE TO authenticated USING((SELECT private.urc_role()) IN ('owner','editor')) WITH CHECK((SELECT private.urc_role()) IN ('owner','editor'));

CREATE TABLE private.urc_history (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, entry_id uuid NOT NULL,
 actor_id uuid, saved_at timestamptz NOT NULL DEFAULT now(), prior_record jsonb NOT NULL
);
ALTER TABLE private.urc_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.urc_history FROM PUBLIC,anon,authenticated;
GRANT ALL ON private.urc_history TO service_role;

CREATE FUNCTION private.urc_entry_write() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE snapshot jsonb;
BEGIN
 IF TG_OP='INSERT' THEN NEW.revision:=1;NEW.created_by:=auth.uid();NEW.created_at:=now();NEW.published_snapshot:=NULL;
 ELSE
  IF NEW.revision<>OLD.revision+1 THEN RAISE EXCEPTION 'This draft changed. Reload the saved version before replacing it.';END IF;
  INSERT INTO private.urc_history(entry_id,actor_id,prior_record) VALUES(OLD.id,auth.uid(),to_jsonb(OLD));
  NEW.created_by:=OLD.created_by;NEW.created_at:=OLD.created_at;NEW.published_snapshot:=OLD.published_snapshot;
 END IF;
 NEW.updated_by:=auth.uid();NEW.updated_at:=now();
 snapshot:=jsonb_build_object('title',NEW.title,'slug',NEW.slug,'payload',NEW.payload);
 IF NEW.publish_requested THEN
  IF NEW.kind='event' THEN
   IF coalesce(NEW.payload->>'startsAt','')='' OR coalesce(NEW.payload->>'location','')='' OR coalesce(NEW.payload->>'activities','')='' OR coalesce(NEW.payload->>'purpose','')='' THEN RAISE EXCEPTION 'Confirm the date, meeting point, activities and cause before publishing.';END IF;
   PERFORM (NEW.payload->>'startsAt')::timestamptz;
   IF coalesce(NEW.payload->>'capacity','')<>'' AND (NEW.payload->>'capacity'!~'^[1-9][0-9]{0,5}$') THEN RAISE EXCEPTION 'Use a participant limit between 1 and 999999, or leave it empty.';END IF;
   IF coalesce(NEW.payload->>'partnerOffer','')<>'' AND coalesce(trim(NEW.payload->>'offerTerms'),'')='' THEN RAISE EXCEPTION 'Add the partner offer terms.';END IF;
   IF coalesce(NEW.payload->>'registration','')='open' AND coalesce(NEW.payload->>'registrationMode','external')<>'free-pass' AND coalesce(NEW.payload->>'joinUrl','')!~'^https://' THEN RAISE EXCEPTION 'Add a verified registration link before opening registration.';END IF;
  END IF;
  IF NEW.kind='album' AND (coalesce(jsonb_array_length(NEW.payload->'photos'),0)=0 OR NOT EXISTS(SELECT 1 FROM public.urc_entries e WHERE e.id::text=NEW.payload->>'eventId' AND e.kind='event' AND e.status='published')) THEN RAISE EXCEPTION 'An album needs photos and a published event.';END IF;
  IF NEW.kind='recap' AND coalesce(trim(NEW.payload->>'summary'),'')='' THEN RAISE EXCEPTION 'Add the event summary.';END IF;
  IF NEW.kind='partner' AND coalesce(NEW.payload->>'contribution','')='' THEN RAISE EXCEPTION 'Describe the partner contribution.';END IF;
  NEW.published_snapshot:=snapshot;NEW.status:='published';
 ELSIF NEW.status<>'archived' THEN NEW.status:=CASE WHEN NEW.published_snapshot IS NOT NULL THEN 'published' ELSE 'draft' END;
 END IF;
 NEW.publish_requested:=false;NEW.has_unpublished_changes:=(NEW.published_snapshot IS DISTINCT FROM snapshot);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.urc_entry_write() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER urc_entry_version BEFORE INSERT OR UPDATE ON public.urc_entries FOR EACH ROW EXECUTE FUNCTION private.urc_entry_write();

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('urc-media','urc-media',false,10485760,ARRAY['image/jpeg','image/png','image/webp'])
 ON CONFLICT(id) DO NOTHING;
CREATE POLICY urc_media_team_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='urc-media' AND (SELECT private.urc_role()) IN ('owner','editor'));
CREATE POLICY urc_media_team_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='urc-media' AND (SELECT private.urc_role()) IN ('owner','editor') AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY urc_media_own_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='urc-media' AND (SELECT private.urc_role()) IN ('owner','editor') AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY urc_media_published ON storage.objects FOR SELECT TO anon USING(bucket_id='urc-media' AND EXISTS(
 SELECT 1 FROM public.urc_entries e WHERE e.status='published' AND (
 e.published_snapshot->'payload'->>'coverPath'=storage.objects.name OR
 e.published_snapshot->'payload'->'photos' @> jsonb_build_array(jsonb_build_object('path',storage.objects.name))
 )));

CREATE TABLE private.urc_registrations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES public.urc_entries(id),
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 80), activity text NOT NULL CHECK(length(trim(activity)) BETWEEN 1 AND 100),
 email text CHECK(email IS NULL OR length(email)<=254), phone text CHECK(phone IS NULL OR length(phone)<=40),
 token_hash text NOT NULL UNIQUE CHECK(token_hash~'^[a-f0-9]{64}$'),
 pass_code text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
 status text NOT NULL DEFAULT 'registered' CHECK(status IN ('registered','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(), checked_in_at timestamptz, checked_in_by uuid REFERENCES auth.users(id)
);
ALTER TABLE private.urc_registrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.urc_registrations FROM PUBLIC,anon,authenticated;
GRANT ALL ON private.urc_registrations TO service_role;
CREATE INDEX urc_registration_event ON private.urc_registrations(event_id,status);
CREATE TABLE private.urc_registration_limits (event_id uuid NOT NULL,rate_key text NOT NULL,window_start timestamptz NOT NULL,calls integer NOT NULL,PRIMARY KEY(event_id,rate_key,window_start));
ALTER TABLE private.urc_registration_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.urc_registration_limits FROM PUBLIC,anon,authenticated;
GRANT ALL ON private.urc_registration_limits TO service_role;

CREATE FUNCTION public.urc_register_free_pass(event uuid,participant text,activity_name text,contact_email text,contact_phone text,hashed_token text,rate_key text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE e public.urc_entries; data jsonb; count_now integer; capacity integer; rate_count integer; start_window timestamptz; registration private.urc_registrations;
BEGIN
 SELECT * INTO e FROM public.urc_entries WHERE id=event AND kind='event' AND status='published' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Registration is unavailable.';END IF;
 data:=e.published_snapshot->'payload';
 IF coalesce(data->>'registration','')<>'open' OR (data->>'startsAt')::timestamptz<now() THEN RAISE EXCEPTION 'Registration is closed.';END IF;
 IF coalesce(data->>'registrationMode','')<>'free-pass' THEN RAISE EXCEPTION 'Use the event’s confirmed registration route.';END IF;
 IF length(rate_key)<>64 THEN RAISE EXCEPTION 'Invalid registration request.';END IF;
 start_window:=to_timestamp(floor(extract(epoch FROM now())/900)*900);
 INSERT INTO private.urc_registration_limits AS limits VALUES(event,rate_key,start_window,1)
 ON CONFLICT ON CONSTRAINT urc_registration_limits_pkey DO UPDATE SET calls=limits.calls+1 RETURNING calls INTO rate_count;
 IF rate_count>3 THEN RAISE EXCEPTION 'Too many registration attempts. Please try again later.';END IF;
 DELETE FROM private.urc_registration_limits WHERE window_start<now()-interval '2 days';
 IF coalesce(data->>'capacity','')~'^[0-9]{1,6}$' THEN capacity:=(data->>'capacity')::integer;END IF;
 IF capacity IS NOT NULL THEN SELECT count(*) INTO count_now FROM private.urc_registrations WHERE event_id=event AND status='registered';IF count_now>=capacity THEN RAISE EXCEPTION 'This run has reached capacity.';END IF;END IF;
 INSERT INTO private.urc_registrations(event_id,name,activity,email,phone,token_hash)
 VALUES(event,trim(participant),left(activity_name,100),nullif(trim(contact_email),''),nullif(trim(contact_phone),''),hashed_token) RETURNING * INTO registration;
 RETURN jsonb_build_object('id',registration.id,'passCode',registration.pass_code);
END $$;
REVOKE ALL ON FUNCTION public.urc_register_free_pass(uuid,text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.urc_register_free_pass(uuid,text,text,text,text,text,text) TO service_role;

CREATE FUNCTION public.urc_get_pass(hashed_token text) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object('id',r.id,'passCode',r.pass_code,'name',r.name,'activity',r.activity,'status',r.status,'checkedInAt',r.checked_in_at,'event',jsonb_build_object('id',e.id,'title',e.published_snapshot->>'title','slug',e.published_snapshot->>'slug','payload',e.published_snapshot->'payload','status',e.status))
 FROM private.urc_registrations r JOIN public.urc_entries e ON e.id=r.event_id WHERE r.token_hash=hashed_token
$$;
REVOKE ALL ON FUNCTION public.urc_get_pass(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.urc_get_pass(text) TO service_role;

CREATE FUNCTION private.urc_check_in(pass_reference text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE registration private.urc_registrations;event_title text;was_used boolean;
BEGIN
 IF coalesce(private.urc_role(),'') NOT IN ('owner','editor','checkin') OR auth.uid() IS NULL THEN RAISE EXCEPTION 'Team access required.';END IF;
 SELECT * INTO registration FROM private.urc_registrations WHERE token_hash=pass_reference OR pass_code=upper(pass_reference) FOR UPDATE;
 IF NOT FOUND OR registration.status<>'registered' THEN RAISE EXCEPTION 'This pass is not valid.';END IF;
 SELECT published_snapshot->>'title' INTO event_title FROM public.urc_entries WHERE id=registration.event_id AND status='published';
 IF event_title IS NULL THEN RAISE EXCEPTION 'This event is unavailable.';END IF;
 was_used:=registration.checked_in_at IS NOT NULL;
 IF NOT was_used THEN UPDATE private.urc_registrations SET checked_in_at=now(),checked_in_by=auth.uid() WHERE id=registration.id RETURNING * INTO registration;END IF;
 RETURN jsonb_build_object('name',registration.name,'event',event_title,'passCode',registration.pass_code,'alreadyUsed',was_used,'checkedInAt',registration.checked_in_at);
END $$;
REVOKE ALL ON FUNCTION private.urc_check_in(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.urc_check_in(text) TO authenticated;
CREATE FUNCTION public.urc_check_in(pass_reference text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT private.urc_check_in(pass_reference)$$;
REVOKE ALL ON FUNCTION public.urc_check_in(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.urc_check_in(text) TO authenticated;

CREATE TABLE public.urc_donations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES public.urc_entries(id),
 amount_minor integer NOT NULL CHECK(amount_minor>0), currency text NOT NULL CHECK(currency IN ('USD','ZWG')),
 method text NOT NULL CHECK(method IN ('cash','ecocash','online')), reference text CHECK(reference IS NULL OR length(reference)<=120),
 status text NOT NULL CHECK(status IN ('pending','confirmed','refunded')),
 recorded_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id), recorded_at timestamptz NOT NULL DEFAULT now(),
 confirmed_by uuid REFERENCES auth.users(id), confirmed_at timestamptz
);
CREATE UNIQUE INDEX urc_ecocash_unique_reference ON public.urc_donations(currency,lower(trim(reference))) WHERE method='ecocash';
ALTER TABLE public.urc_donations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.urc_donations FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.urc_donations TO authenticated;
GRANT ALL ON public.urc_donations TO service_role;
CREATE POLICY donation_private_read ON public.urc_donations FOR SELECT TO authenticated USING((SELECT private.urc_role())='owner' OR ((SELECT private.urc_role())='editor' AND recorded_by=auth.uid()));
CREATE FUNCTION private.urc_record_donation(event uuid,minor_amount integer,donation_currency text,payment_method text,payment_reference text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE donation_id uuid;
BEGIN
 IF auth.uid() IS NULL OR coalesce(private.urc_role(),'') NOT IN ('owner','editor') THEN RAISE EXCEPTION 'Content team access required.';END IF;
 IF payment_method NOT IN ('cash','ecocash') THEN RAISE EXCEPTION 'Online payments require a verified provider callback.';END IF;
 IF payment_method='ecocash' AND coalesce(trim(payment_reference),'')='' THEN RAISE EXCEPTION 'Add the EcoCash transaction reference.';END IF;
 INSERT INTO public.urc_donations(event_id,amount_minor,currency,method,reference,status,recorded_by,confirmed_by,confirmed_at)
 VALUES(event,minor_amount,donation_currency,payment_method,nullif(trim(payment_reference),''),CASE WHEN payment_method='cash' THEN 'confirmed' ELSE 'pending' END,auth.uid(),CASE WHEN payment_method='cash' THEN auth.uid() ELSE NULL END,CASE WHEN payment_method='cash' THEN now() ELSE NULL END) RETURNING id INTO donation_id;
 RETURN donation_id;
END $$;
REVOKE ALL ON FUNCTION private.urc_record_donation(uuid,integer,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.urc_record_donation(uuid,integer,text,text,text) TO authenticated;
CREATE FUNCTION public.urc_record_donation(event uuid,minor_amount integer,donation_currency text,payment_method text,payment_reference text) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT private.urc_record_donation(event,minor_amount,donation_currency,payment_method,payment_reference)$$;
REVOKE ALL ON FUNCTION public.urc_record_donation(uuid,integer,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.urc_record_donation(uuid,integer,text,text,text) TO authenticated;
CREATE FUNCTION private.urc_confirm_ecocash(donation uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR coalesce(private.urc_role(),'')<>'owner' THEN RAISE EXCEPTION 'Owner access required.';END IF;
 UPDATE public.urc_donations SET status='confirmed',confirmed_by=auth.uid(),confirmed_at=now() WHERE id=donation AND method='ecocash' AND status='pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'No pending EcoCash donation found.';END IF;
END $$;
REVOKE ALL ON FUNCTION private.urc_confirm_ecocash(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.urc_confirm_ecocash(uuid) TO authenticated;
CREATE FUNCTION public.urc_confirm_ecocash(donation uuid) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT private.urc_confirm_ecocash(donation)$$;
REVOKE ALL ON FUNCTION public.urc_confirm_ecocash(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.urc_confirm_ecocash(uuid) TO authenticated;

-- Aggregate only for the owner. Never join a donation to a participant pass.
CREATE FUNCTION private.urc_donation_summary() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR coalesce(private.urc_role(),'')<>'owner' THEN RAISE EXCEPTION 'Owner access required.';END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO result FROM (
  SELECT d.event_id,e.published_snapshot->>'title' AS event_title,d.currency,d.method,d.status,sum(d.amount_minor)::bigint AS amount_minor,count(*) AS gifts
  FROM public.urc_donations d JOIN public.urc_entries e ON e.id=d.event_id GROUP BY d.event_id,e.published_snapshot->>'title',d.currency,d.method,d.status
 ) t;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION private.urc_donation_summary() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.urc_donation_summary() TO authenticated;
CREATE FUNCTION public.urc_donation_summary() RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT private.urc_donation_summary()$$;
REVOKE ALL ON FUNCTION public.urc_donation_summary() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.urc_donation_summary() TO authenticated;
CREATE POLICY owner_read_team ON public.urc_team FOR SELECT TO authenticated USING((SELECT private.urc_role())='owner');
