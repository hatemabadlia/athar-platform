-- Storage buckets. All private; access through RLS on storage.objects + signed URLs.
-- Path convention: <user_id>/<uuid>.<ext>

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('tree-photos', 'tree-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('report-evidence', 'report-evidence', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "upload own tree photo" on storage.objects for insert to authenticated
  with check (bucket_id = 'tree-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "read tree photo" on storage.objects for select to anon, authenticated
  using (bucket_id = 'tree-photos' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (select 1 from public.trees t where t.photo_path = name
               and (t.status = 'approved' or public.can_moderate(t.wilaya_code)))
  ));

create policy "delete own tree photo" on storage.objects for delete to authenticated
  using (bucket_id = 'tree-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
         and not exists (select 1 from public.trees t where t.photo_path = name and t.status = 'approved'));

create policy "upload own evidence" on storage.objects for insert to authenticated
  with check (bucket_id = 'report-evidence' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "read evidence" on storage.objects for select to authenticated
  using (bucket_id = 'report-evidence' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (select 1 from public.reports r where name = any (r.evidence_paths)
               and (r.status = 'approved'
                    or (r.alert_id is not null and public.can_moderate(public.alert_wilaya(r.alert_id)))))
  ));
