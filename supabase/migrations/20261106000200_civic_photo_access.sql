-- Fix: the storage read policy queried civic_reports with the caller's rights; anonymous visitors cannot read that
-- table (by design), so published photos were never readable publicly. Decide in one SECURITY DEFINER helper instead.
create or replace function public.civic_photo_readable(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (storage.foldername(object_name))[1] = auth.uid()::text
      or exists (select 1 from public.civic_reports r where object_name = any (r.photo_paths)
                 and ((r.photo_public and public.civic_is_public(r.status)) or public.can_moderate(r.wilaya_code)))
      or exists (select 1 from public.civic_report_events e join public.civic_reports r on r.id = e.report_id
                 where e.photo_path = object_name and e.kind = 'resolution'
                   and (public.civic_is_public(r.status) or public.can_moderate(r.wilaya_code)));
$$;
revoke all on function public.civic_photo_readable(text) from public;
grant execute on function public.civic_photo_readable(text) to anon, authenticated;

drop policy if exists "read civic photo" on storage.objects;
create policy "read civic photo" on storage.objects for select to anon, authenticated
  using (bucket_id = 'civic-photos' and public.civic_photo_readable(name));
