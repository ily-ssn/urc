-- Additive URC community source. Apply only to URC after the base schema.
-- Not applied remotely: the current connector cannot access the URC project.
CREATE TABLE public.urc_member_profiles (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 handle text UNIQUE CHECK(handle IS NULL OR handle ~ '^[a-z0-9][a-z0-9-]{2,28}[a-z0-9]$'),
 display_name text NOT NULL CHECK(length(trim(display_name)) BETWEEN 1 AND 80),
 bio text NOT NULL DEFAULT '' CHECK(length(bio)<=500),
 public_profile boolean NOT NULL DEFAULT false,
 connections_enabled boolean NOT NULL DEFAULT false,
 news_opt_in boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.urc_member_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.urc_member_profiles FROM PUBLIC,anon,authenticated;
-- Public projection is separate, so contact consent is never exposed with a profile.
GRANT SELECT,INSERT,UPDATE,DELETE ON public.urc_member_profiles TO authenticated;
GRANT ALL ON public.urc_member_profiles TO service_role;
CREATE POLICY own_member_profile ON public.urc_member_profiles FOR ALL TO authenticated USING(user_id=(SELECT auth.uid())) WITH CHECK(user_id=(SELECT auth.uid()));

CREATE VIEW private.urc_public_people AS SELECT user_id,handle,display_name,bio,connections_enabled FROM public.urc_member_profiles WHERE public_profile AND handle IS NOT NULL;
REVOKE ALL ON private.urc_public_people FROM PUBLIC,anon,authenticated;
CREATE FUNCTION private.urc_people() RETURNS TABLE(user_id uuid,handle text,display_name text,bio text,connections_enabled boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT user_id,handle,display_name,bio,connections_enabled FROM private.urc_public_people ORDER BY display_name LIMIT 200
$$;
REVOKE ALL ON FUNCTION private.urc_people() FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon;
GRANT EXECUTE ON FUNCTION private.urc_people() TO anon,authenticated;
CREATE FUNCTION public.urc_people() RETURNS TABLE(user_id uuid,handle text,display_name text,bio text,connections_enabled boolean)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$SELECT * FROM private.urc_people()$$;
REVOKE ALL ON FUNCTION public.urc_people() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.urc_people() TO anon,authenticated;

CREATE TABLE public.urc_follows (
 follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 subject_type text NOT NULL CHECK(subject_type IN ('club','partner','member')),
 subject_id text NOT NULL CHECK(length(subject_id) BETWEEN 1 AND 80),
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(follower_id,subject_type,subject_id)
);
ALTER TABLE public.urc_follows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.urc_follows FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.urc_follows TO authenticated;
GRANT ALL ON public.urc_follows TO service_role;
CREATE POLICY own_follow_list ON public.urc_follows FOR SELECT TO authenticated USING(follower_id=(SELECT auth.uid()));
CREATE FUNCTION private.urc_follow(target_type text,target_id text,following boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to follow.';END IF;
 PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));
 IF NOT following THEN DELETE FROM public.urc_follows WHERE follower_id=auth.uid() AND subject_type=target_type AND subject_id=target_id;RETURN;END IF;
 IF NOT ((target_type='club' AND target_id='urc') OR (target_type='member' AND target_id<>auth.uid()::text AND EXISTS(SELECT 1 FROM public.urc_member_profiles WHERE user_id::text=target_id AND public_profile AND handle IS NOT NULL)) OR (target_type='partner' AND (target_id='luxenova' OR EXISTS(SELECT 1 FROM public.urc_entries WHERE kind='partner' AND id::text=target_id AND status='published')))) THEN RAISE EXCEPTION 'This profile is not available to follow.';END IF;
 IF (SELECT count(*) FROM public.urc_follows WHERE follower_id=auth.uid())>=100 THEN RAISE EXCEPTION 'Your follow list has reached its limit.';END IF;
 INSERT INTO public.urc_follows VALUES(auth.uid(),target_type,target_id,now()) ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION private.urc_follow(text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.urc_follow(text,text,boolean) TO authenticated;
CREATE FUNCTION public.urc_follow(target_type text,target_id text,following boolean) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT private.urc_follow(target_type,target_id,following)$$;
REVOKE ALL ON FUNCTION public.urc_follow(text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.urc_follow(text,text,boolean) TO authenticated;

CREATE TABLE public.urc_connections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),requester uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 recipient uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),CHECK(requester<>recipient)
);
CREATE UNIQUE INDEX urc_connection_pair ON public.urc_connections(least(requester,recipient),greatest(requester,recipient));
ALTER TABLE public.urc_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.urc_connections FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.urc_connections TO authenticated;
GRANT ALL ON public.urc_connections TO service_role;
CREATE POLICY own_connections ON public.urc_connections FOR SELECT TO authenticated USING((SELECT auth.uid()) IN (requester,recipient));
CREATE FUNCTION private.urc_connect(target uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR target=auth.uid() THEN RAISE EXCEPTION 'Choose another member.';END IF;
 PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));
 IF NOT EXISTS(SELECT 1 FROM public.urc_member_profiles WHERE user_id=auth.uid() AND public_profile AND handle IS NOT NULL) THEN RAISE EXCEPTION 'Set up your public member profile first.';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.urc_member_profiles WHERE user_id=target AND public_profile AND connections_enabled AND handle IS NOT NULL) THEN RAISE EXCEPTION 'This member is not accepting connection requests.';END IF;
 IF EXISTS(SELECT 1 FROM public.urc_connections WHERE (requester=auth.uid() AND recipient=target) OR (requester=target AND recipient=auth.uid())) THEN RAISE EXCEPTION 'A connection request already exists for these members.';END IF;
 IF (SELECT count(*) FROM public.urc_connections WHERE requester=auth.uid() AND created_at>now()-interval '1 day')>=10 THEN RAISE EXCEPTION 'Connection request limit reached. Try again tomorrow.';END IF;
 INSERT INTO public.urc_connections(requester,recipient) VALUES(auth.uid(),target);
END $$;
CREATE FUNCTION private.urc_connection_reply(request_id uuid,decision text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR decision NOT IN ('accepted','declined','cancelled') THEN RAISE EXCEPTION 'Choose a valid response.';END IF;
 UPDATE public.urc_connections SET status=decision,updated_at=now() WHERE id=request_id AND ((recipient=auth.uid() AND status='pending' AND decision IN ('accepted','declined')) OR (auth.uid() IN (requester,recipient) AND status IN ('pending','accepted') AND decision='cancelled'));
 IF NOT FOUND THEN RAISE EXCEPTION 'This request is not available to change.';END IF;
END $$;
REVOKE ALL ON FUNCTION private.urc_connect(uuid),private.urc_connection_reply(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.urc_connect(uuid),private.urc_connection_reply(uuid,text) TO authenticated;
CREATE FUNCTION public.urc_connect(target uuid) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT private.urc_connect(target)$$;
CREATE FUNCTION public.urc_connection_reply(request_id uuid,decision text) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT private.urc_connection_reply(request_id,decision)$$;
REVOKE ALL ON FUNCTION public.urc_connect(uuid),public.urc_connection_reply(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.urc_connect(uuid),public.urc_connection_reply(uuid,text) TO authenticated;

CREATE TABLE public.urc_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),kind text NOT NULL CHECK(kind IN ('contact','feedback','waitlist')),
 event_id uuid REFERENCES public.urc_entries(id),name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 80),
 email text NOT NULL CHECK(length(email) BETWEEN 3 AND 254),topic text NOT NULL DEFAULT 'general' CHECK(length(topic)<=40),
 message text NOT NULL CHECK(length(message)<=3000),status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','replied','resolved')),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.urc_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.urc_requests FROM PUBLIC,anon,authenticated;
GRANT SELECT,UPDATE(status) ON public.urc_requests TO authenticated;
GRANT ALL ON public.urc_requests TO service_role;
CREATE POLICY contact_team_read ON public.urc_requests FOR SELECT TO authenticated USING((SELECT private.urc_role()) IN ('owner','editor'));
CREATE POLICY contact_team_update ON public.urc_requests FOR UPDATE TO authenticated USING((SELECT private.urc_role()) IN ('owner','editor')) WITH CHECK((SELECT private.urc_role()) IN ('owner','editor'));
CREATE TABLE private.urc_http_limits(bucket text PRIMARY KEY,window_start timestamptz NOT NULL,calls integer NOT NULL);
ALTER TABLE private.urc_http_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.urc_http_limits FROM PUBLIC,anon,authenticated;
GRANT ALL ON private.urc_http_limits TO service_role;
CREATE FUNCTION public.urc_claim_request(bucket_key text) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE calls_now integer;BEGIN
 IF length(bucket_key)<>64 THEN RETURN false;END IF;
 INSERT INTO private.urc_http_limits AS limits VALUES(bucket_key,now(),1) ON CONFLICT(bucket) DO UPDATE SET calls=CASE WHEN limits.window_start<now()-interval '15 minutes' THEN 1 ELSE limits.calls+1 END,window_start=CASE WHEN limits.window_start<now()-interval '15 minutes' THEN now() ELSE limits.window_start END RETURNING calls INTO calls_now;
 DELETE FROM private.urc_http_limits WHERE window_start<now()-interval '2 days';RETURN calls_now<=5;
END $$;
REVOKE ALL ON FUNCTION public.urc_claim_request(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.urc_claim_request(text) TO service_role;

CREATE TABLE private.urc_operation_log(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor_id uuid,action text,subject_id uuid,reason text,created_at timestamptz DEFAULT now());
ALTER TABLE private.urc_operation_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.urc_operation_log FROM PUBLIC,anon,authenticated;
GRANT ALL ON private.urc_operation_log TO service_role;
CREATE FUNCTION private.urc_ops(operation text,event_id uuid DEFAULT NULL,details jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;staff_role text:=private.urc_role();BEGIN
 IF auth.uid() IS NULL OR coalesce(staff_role,'') NOT IN ('owner','editor','checkin') THEN RAISE EXCEPTION 'URC team access required.';END IF;
 IF operation='participants' THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'activity',r.activity,'passCode',r.pass_code,'status',r.status,'checkedInAt',r.checked_in_at,'email',CASE WHEN staff_role IN ('owner','editor') THEN r.email ELSE NULL END,'phone',CASE WHEN staff_role IN ('owner','editor') THEN r.phone ELSE NULL END)),'[]') INTO result FROM (SELECT * FROM private.urc_registrations r WHERE r.event_id=urc_ops.event_id ORDER BY r.created_at DESC LIMIT 1000) r;RETURN result;
 END IF;
 IF operation='summary' THEN
  SELECT jsonb_build_object('registrations',(SELECT count(*) FROM private.urc_registrations WHERE status='registered'),'checkins',(SELECT count(*) FROM private.urc_registrations WHERE checked_in_at IS NOT NULL AND status='registered'),'events',(SELECT coalesce(jsonb_agg(t),'[]') FROM (SELECT e.id,e.published_snapshot->>'title' title,count(r.id) FILTER(WHERE r.status='registered') registered,count(r.id) FILTER(WHERE r.checked_in_at IS NOT NULL AND r.status='registered') checked_in FROM public.urc_entries e LEFT JOIN private.urc_registrations r ON r.event_id=e.id WHERE e.kind='event' GROUP BY e.id ORDER BY e.updated_at DESC LIMIT 12) t),'requests',CASE WHEN staff_role IN ('owner','editor') THEN (SELECT count(*) FROM public.urc_requests WHERE status='new') ELSE NULL END) INTO result;RETURN result;
 END IF;
 IF staff_role NOT IN ('owner','editor') THEN RAISE EXCEPTION 'Content team access required.';END IF;
 IF operation='history' THEN
  SELECT coalesce(jsonb_agg(t),'[]') INTO result FROM (SELECT h.id,h.saved_at,h.entry_id,h.prior_record->>'title' title,coalesce(team.display_name,'Former team member') actor FROM private.urc_history h LEFT JOIN public.urc_team team ON team.user_id=h.actor_id ORDER BY h.saved_at DESC LIMIT 50) t;RETURN result;
 ELSIF operation='undo-checkin' THEN
  IF length(trim(coalesce(details->>'reason','')))<20 THEN RAISE EXCEPTION 'Record why the check-in needs reversing (at least 20 characters).';END IF;
  UPDATE private.urc_registrations SET checked_in_at=NULL,checked_in_by=NULL WHERE id=urc_ops.event_id AND checked_in_at IS NOT NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'No recorded check-in found.';END IF;
  INSERT INTO private.urc_operation_log(actor_id,action,subject_id,reason) VALUES(auth.uid(),'undo-checkin',event_id,left(details->>'reason',500));RETURN '{"reversed":true}';
 END IF;RAISE EXCEPTION 'Unknown operation.';
END $$;
REVOKE ALL ON FUNCTION private.urc_ops(text,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.urc_ops(text,uuid,jsonb) TO authenticated;
CREATE FUNCTION public.urc_ops(operation text,event_id uuid DEFAULT NULL,details jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT private.urc_ops(operation,event_id,details)$$;
REVOKE ALL ON FUNCTION public.urc_ops(text,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.urc_ops(text,uuid,jsonb) TO authenticated;

CREATE FUNCTION public.urc_cancel_pass(hashed_token text) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE registration private.urc_registrations;BEGIN
 SELECT * INTO registration FROM private.urc_registrations WHERE token_hash=hashed_token FOR UPDATE;
 IF NOT FOUND OR registration.checked_in_at IS NOT NULL THEN RETURN false;END IF;
 IF EXISTS(SELECT 1 FROM public.urc_entries WHERE id=registration.event_id AND (published_snapshot->'payload'->>'startsAt')::timestamptz<=now()) THEN RETURN false;END IF;
 UPDATE private.urc_registrations SET status='cancelled' WHERE id=registration.id;RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.urc_cancel_pass(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.urc_cancel_pass(text) TO service_role;

CREATE FUNCTION private.urc_registration_event_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p jsonb;BEGIN
 SELECT published_snapshot->'payload' INTO p FROM public.urc_entries WHERE id=NEW.event_id AND status='published' AND kind='event';
 IF p IS NULL OR coalesce(p->>'eventStatus','scheduled') IN ('cancelled','postponed') THEN RAISE EXCEPTION 'Registration is unavailable for this event.';END IF;
 IF coalesce(p->>'registrationClosesAt','')<>'' AND (p->>'registrationClosesAt')::timestamptz<=now() THEN RAISE EXCEPTION 'Registration is closed.';END IF;
 IF coalesce(trim(p->>'activityOptions'),'')<>'' AND NOT EXISTS(SELECT 1 FROM regexp_split_to_table(p->>'activityOptions',E'\\n') choice WHERE trim(choice)=trim(NEW.activity)) THEN RAISE EXCEPTION 'Choose one of the confirmed event activities.';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.urc_registration_event_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER urc_registration_event_guard BEFORE INSERT ON private.urc_registrations FOR EACH ROW EXECUTE FUNCTION private.urc_registration_event_guard();

CREATE FUNCTION private.urc_event_details_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF length(NEW.payload::text)>250000 THEN RAISE EXCEPTION 'This content payload is too large.';END IF;
 IF NEW.kind='event' THEN
  IF coalesce(NEW.payload->>'eventStatus','scheduled') NOT IN ('','scheduled','cancelled','postponed') THEN RAISE EXCEPTION 'Choose a valid event status.';END IF;
  IF coalesce(NEW.payload->>'waitlist','no') NOT IN ('','no','yes') THEN RAISE EXCEPTION 'Choose a valid waiting-list option.';END IF;
  IF coalesce(NEW.payload->>'mapUrl','')<>'' AND NEW.payload->>'mapUrl'!~'^https://' THEN RAISE EXCEPTION 'Directions must use a confirmed HTTPS link.';END IF;
  IF coalesce(NEW.payload->>'endsAt','')<>'' THEN
   IF (NEW.payload->>'endsAt')::timestamptz<=(NEW.payload->>'startsAt')::timestamptz THEN RAISE EXCEPTION 'The finish must be after the start.';END IF;
  END IF;
  IF coalesce(NEW.payload->>'registrationClosesAt','')<>'' THEN PERFORM (NEW.payload->>'registrationClosesAt')::timestamptz;END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.urc_event_details_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER urc_details_guard BEFORE INSERT OR UPDATE ON public.urc_entries FOR EACH ROW EXECUTE FUNCTION private.urc_event_details_guard();

ALTER TABLE private.urc_registrations ADD COLUMN member_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE FUNCTION public.urc_register_group(event uuid,participants jsonb,hashed_tokens jsonb,rate_key text,member uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE person jsonb;result jsonb;results jsonb:='[]';i integer:=0;per_person_key text;BEGIN
 IF jsonb_typeof(participants)<>'array' OR jsonb_array_length(participants) NOT BETWEEN 1 AND 6 OR jsonb_array_length(hashed_tokens)<>jsonb_array_length(participants) THEN RAISE EXCEPTION 'Choose between one and six participants.';END IF;
 IF NOT public.urc_claim_request(rate_key) THEN RAISE EXCEPTION 'Too many registration attempts. Try again later.';END IF;
 FOR person IN SELECT * FROM jsonb_array_elements(participants) LOOP
  per_person_key:=md5(rate_key||i::text)||md5(i::text||rate_key);
  result:=public.urc_register_free_pass(event,person->>'name',person->>'activity',coalesce(person->>'email',''),coalesce(person->>'phone',''),hashed_tokens->>i,per_person_key);
  IF member IS NOT NULL THEN UPDATE private.urc_registrations SET member_id=member WHERE id=(result->>'id')::uuid;END IF;
  results:=results||jsonb_build_array(result);i:=i+1;
 END LOOP;RETURN results;
END $$;
REVOKE ALL ON FUNCTION public.urc_register_group(uuid,jsonb,jsonb,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.urc_register_group(uuid,jsonb,jsonb,text,uuid) TO service_role;
CREATE FUNCTION private.urc_member_passes() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to see your event history.';END IF;
 SELECT coalesce(jsonb_agg(t),'[]') INTO result FROM (SELECT r.id,r.pass_code,r.activity,r.status,r.checked_in_at,e.published_snapshot->>'title' event_title,e.published_snapshot->>'slug' event_slug FROM private.urc_registrations r JOIN public.urc_entries e ON e.id=r.event_id WHERE r.member_id=auth.uid() ORDER BY r.created_at DESC LIMIT 100) t;RETURN result;
END $$;
REVOKE ALL ON FUNCTION private.urc_member_passes() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.urc_member_passes() TO authenticated;
CREATE FUNCTION public.urc_member_passes() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$SELECT private.urc_member_passes()$$;
REVOKE ALL ON FUNCTION public.urc_member_passes() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.urc_member_passes() TO authenticated;
CREATE FUNCTION public.urc_replace_member_pass(registration uuid,member uuid,new_hash text) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 UPDATE private.urc_registrations SET token_hash=new_hash WHERE id=registration AND member_id=member AND status='registered';RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.urc_replace_member_pass(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.urc_replace_member_pass(uuid,uuid,text) TO service_role;

CREATE TABLE private.urc_redemptions (registration_id uuid PRIMARY KEY REFERENCES private.urc_registrations(id),redeemed_by uuid NOT NULL REFERENCES auth.users(id),redeemed_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE private.urc_redemptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.urc_redemptions FROM PUBLIC,anon,authenticated;
GRANT ALL ON private.urc_redemptions TO service_role;
CREATE FUNCTION private.urc_benefit(pass_reference text,redeem boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r private.urc_registrations;p jsonb;used timestamptz;BEGIN
 IF auth.uid() IS NULL OR coalesce(private.urc_role(),'') NOT IN ('owner','editor','checkin') THEN RAISE EXCEPTION 'Team access required.';END IF;
 SELECT * INTO r FROM private.urc_registrations WHERE pass_code=upper(pass_reference) OR token_hash=pass_reference FOR UPDATE;
 IF NOT FOUND OR r.status<>'registered' OR r.checked_in_at IS NULL THEN RAISE EXCEPTION 'A valid checked-in pass is required.';END IF;
 SELECT published_snapshot->'payload' INTO p FROM public.urc_entries WHERE id=r.event_id AND status='published';
 IF coalesce(trim(p->>'partnerOffer'),'')='' OR coalesce(p->>'offerValidUntil','')='' THEN RETURN NULL;END IF;
 IF (p->>'offerValidUntil')::timestamptz<now() THEN RAISE EXCEPTION 'This benefit has expired.';END IF;
 SELECT redeemed_at INTO used FROM private.urc_redemptions WHERE registration_id=r.id;
 IF redeem AND used IS NULL THEN INSERT INTO private.urc_redemptions(registration_id,redeemed_by)VALUES(r.id,auth.uid()) RETURNING redeemed_at INTO used;END IF;
 RETURN jsonb_build_object('offer',p->>'partnerOffer','terms',p->>'offerTerms','validUntil',p->>'offerValidUntil','redeemedAt',used);
END $$;
REVOKE ALL ON FUNCTION private.urc_benefit(text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.urc_benefit(text,boolean) TO authenticated;
CREATE FUNCTION public.urc_benefit(pass_reference text,redeem boolean DEFAULT false) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT private.urc_benefit(pass_reference,redeem)$$;
REVOKE ALL ON FUNCTION public.urc_benefit(text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.urc_benefit(text,boolean) TO authenticated;

CREATE TABLE private.urc_ai_limits(actor uuid NOT NULL,day date NOT NULL,calls integer NOT NULL,PRIMARY KEY(actor,day));
ALTER TABLE private.urc_ai_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.urc_ai_limits FROM PUBLIC,anon,authenticated;
GRANT ALL ON private.urc_ai_limits TO service_role;
CREATE FUNCTION public.urc_claim_ai(actor uuid) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE today date:=(now() AT TIME ZONE 'UTC')::date;global_calls integer;own_calls integer;BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.urc_team WHERE user_id=actor AND role IN ('owner','editor')) THEN RETURN false;END IF;
 INSERT INTO private.urc_ai_limits AS limits VALUES('00000000-0000-0000-0000-000000000000',today,1) ON CONFLICT ON CONSTRAINT urc_ai_limits_pkey DO UPDATE SET calls=limits.calls+1 WHERE limits.calls<100 RETURNING calls INTO global_calls;
 IF global_calls IS NULL THEN RETURN false;END IF;
 INSERT INTO private.urc_ai_limits AS limits VALUES(actor,today,1) ON CONFLICT ON CONSTRAINT urc_ai_limits_pkey DO UPDATE SET calls=limits.calls+1 WHERE limits.calls<20 RETURNING calls INTO own_calls;
 DELETE FROM private.urc_ai_limits WHERE day<today-interval '7 days';RETURN own_calls IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.urc_claim_ai(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.urc_claim_ai(uuid) TO service_role;

CREATE FUNCTION private.urc_public_stats() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT jsonb_build_object('followers',(SELECT count(*) FROM public.urc_follows WHERE subject_type='club' AND subject_id='urc'))$$;
REVOKE ALL ON FUNCTION private.urc_public_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.urc_public_stats() TO anon,authenticated;
CREATE FUNCTION public.urc_public_stats() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$SELECT private.urc_public_stats()$$;
REVOKE ALL ON FUNCTION public.urc_public_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.urc_public_stats() TO anon,authenticated;
