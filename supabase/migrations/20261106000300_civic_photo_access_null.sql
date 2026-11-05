-- civic_photo_readable returned NULL (not false) for anonymous callers because auth.uid() is NULL.
-- Storage policies already treat NULL as deny, but the function must answer a plain boolean.
create or replace function public.civic_photo_readable(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((storage.foldername(object_name))[1] = auth.uid()::text, false)
      or exists (select 1 from public.civic_reports r where object_name = any (r.photo_paths)
                 and ((r.photo_public and public.civic_is_public(r.status)) or public.can_moderate(r.wilaya_code)))
      or exists (select 1 from public.civic_report_events e join public.civic_reports r on r.id = e.report_id
                 where e.photo_path = object_name and e.kind = 'resolution'
                   and (public.civic_is_public(r.status) or public.can_moderate(r.wilaya_code)));
$$;
