-- Private uploads become readable only when referenced by published content.
DROP POLICY IF EXISTS urc_media_published ON storage.objects;
CREATE POLICY urc_media_published ON storage.objects FOR SELECT TO anon
USING (bucket_id='urc-media' AND EXISTS (
 SELECT 1 FROM public.urc_entries e WHERE e.status='published' AND (
  e.published_snapshot->'payload'->>'coverPath'=storage.objects.name OR
  e.published_snapshot->'payload'->>'heroPath'=storage.objects.name OR
  e.published_snapshot->'payload'->>'figuresPath'=storage.objects.name OR
  e.published_snapshot->'payload'->>'prepRunPath'=storage.objects.name OR
  e.published_snapshot->'payload'->>'prepSimplePath'=storage.objects.name OR
  e.published_snapshot->'payload'->>'prepTicketPath'=storage.objects.name OR
  e.published_snapshot->'payload'->'photos' @> jsonb_build_array(jsonb_build_object('path',storage.objects.name))
 )));
