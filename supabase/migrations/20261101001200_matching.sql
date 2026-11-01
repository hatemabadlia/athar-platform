-- Candidate search for the ingestion pipeline (service role only).

-- Recycled-content candidates from the archive of content the platform has actually seen.
create or replace function public.match_historical(
  p_text text, p_hash text, p_phone_hashes text[], p_embedding extensions.vector(1024) default null, p_limit int default 5)
returns table (id uuid, normalized_text text, first_seen_at timestamptz, resolved_at timestamptz, times_seen int,
               category public.alert_category, wilaya_code smallint, exact boolean, text_similarity real,
               vector_similarity real, phone_match boolean)
language sql stable security definer set search_path = '' as $$
  select h.id, h.normalized_text, h.first_seen_at, h.resolved_at, h.times_seen, h.category, h.wilaya_code,
         h.content_hash = p_hash,
         extensions.similarity(h.normalized_text, p_text),
         case when p_embedding is not null and h.embedding is not null
              then (1 - (h.embedding operator(extensions.<=>) p_embedding))::real end,
         coalesce(h.phone_hashes && p_phone_hashes, false)
  from public.historical_posts h
  where h.content_hash = p_hash
     or extensions.similarity(h.normalized_text, p_text) > 0.25
     or (cardinality(p_phone_hashes) > 0 and h.phone_hashes && p_phone_hashes)
     or (p_embedding is not null and h.embedding is not null and (h.embedding operator(extensions.<=>) p_embedding) < 0.2)
  order by (h.content_hash = p_hash) desc, extensions.similarity(h.normalized_text, p_text) desc
  limit p_limit;
$$;

-- Duplicate candidates among currently active alerts (pending/approved) in a time window.
create or replace function public.match_active_alerts(
  p_text text, p_phone_hashes text[], p_wilaya smallint, p_category public.alert_category,
  p_embedding extensions.vector(1024) default null, p_days int default 21, p_limit int default 5)
returns table (id uuid, title text, status public.alert_status, wilaya_code smallint, category public.alert_category,
               created_at timestamptz, text_similarity real, vector_similarity real, phone_match boolean,
               same_place boolean, same_category boolean)
language sql stable security definer set search_path = '' as $$
  select a.id, a.title, a.status, a.wilaya_code, a.category, a.created_at,
         extensions.similarity(coalesce(a.canonical_text, a.original_text), p_text),
         case when p_embedding is not null and a.embedding is not null
              then (1 - (a.embedding operator(extensions.<=>) p_embedding))::real end,
         coalesce(c.phone_hash = any (p_phone_hashes), false),
         a.wilaya_code is not distinct from p_wilaya,
         a.category = p_category
  from public.alerts a
  left join public.alert_contacts c on c.alert_id = a.id
  where a.status in ('pending', 'approved')
    and a.created_at > now() - make_interval(days => p_days)
    and (extensions.similarity(coalesce(a.canonical_text, a.original_text), p_text) > 0.25
         or (cardinality(p_phone_hashes) > 0 and c.phone_hash = any (p_phone_hashes))
         or (p_embedding is not null and a.embedding is not null and (a.embedding operator(extensions.<=>) p_embedding) < 0.2))
  order by extensions.similarity(coalesce(a.canonical_text, a.original_text), p_text) desc
  limit p_limit;
$$;

revoke execute on function public.match_historical(text, text, text[], extensions.vector, int) from public, anon, authenticated;
revoke execute on function public.match_active_alerts(text, text[], smallint, public.alert_category, extensions.vector, int, int) from public, anon, authenticated;
grant execute on function public.match_historical(text, text, text[], extensions.vector, int) to service_role;
grant execute on function public.match_active_alerts(text, text[], smallint, public.alert_category, extensions.vector, int, int) to service_role;

-- Live monitor: moderators subscribe to intake_items via Realtime.
alter publication supabase_realtime add table public.intake_items;
alter publication supabase_realtime add table public.alerts;
alter publication supabase_realtime add table public.crises;
