-- Skills-based volunteering ("ماشي كل مساعدة مادية"): requests can name the skills they need, volunteers
-- declare skills and whether they can help remotely, and regulated professions (doctor, lawyer, psychologist)
-- only count once a moderator has verified them.

insert into public.categories (key, label_ar, label_fr, emoji, sort_order)
values ('skills', 'مهارات وخدمات', 'Compétences et services', '🛠️', 7)
on conflict (key) do nothing;

-- Reference list of skills (labels are the stable keys already stored in profiles.skills).
create table public.skills (
  key        text primary key,
  label_fr   text not null,
  regulated  boolean not null default false,  -- needs verification before the person is matched for it
  remote     boolean not null default false,  -- can usually be done remotely
  sort_order smallint not null default 0
);
alter table public.skills enable row level security;
create policy "skills readable" on public.skills for select to anon, authenticated using (true);

insert into public.skills (key, label_fr, regulated, remote, sort_order) values
  ('إسعافات أولية',        'Premiers secours',               false, false, 1),
  ('نقل وتوزيع',            'Transport et livraison',         false, false, 2),
  ('طبخ',                   'Cuisine',                        false, false, 3),
  ('تعليم ودعم مدرسي',      'Cours et soutien scolaire',      false, true,  4),
  ('تصميم وإعلام',          'Design et communication',        false, true,  5),
  ('برمجة',                 'Programmation et sites web',     false, true,  6),
  ('تنظيم فعاليات',         'Organisation d''événements',     false, false, 7),
  ('ترجمة',                 'Traduction',                     false, true,  8),
  ('مرافقة إدارية',         'Accompagnement administratif',   false, false, 9),
  ('تصوير',                 'Photo et vidéo',                 false, false, 10),
  ('دعم نفسي',              'Écoute et soutien',              false, true,  11),
  ('صيانة وبناء',           'Bricolage et construction',      false, false, 12),
  ('استشارة طبية',          'Consultation médicale',          true,  true,  13),
  ('استشارة قانونية',       'Conseil juridique',              true,  true,  14),
  ('أخصائي نفساني',         'Psychologue',                    true,  true,  15)
on conflict (key) do nothing;

alter table public.alerts
  add column required_skills text[] not null default '{}',
  add column remote_ok boolean not null default false;
grant update (required_skills, remote_ok) on public.alerts to authenticated;

alter table public.profiles add column remote_ok boolean not null default false;
grant update (remote_ok) on public.profiles to authenticated;

-- Verified professional skills (only for skills.regulated = true). Written only through verify_skill().
create table public.skill_verifications (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  skill       text not null references public.skills(key) on update cascade,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz not null default now(),
  note        text check (note is null or char_length(note) <= 300),
  primary key (user_id, skill)
);
alter table public.skill_verifications enable row level security;
create policy "own skill verifications" on public.skill_verifications for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

create or replace function public.verify_skill(p_target uuid, p_skill text, p_approve boolean, p_note text default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare w smallint; reg boolean;
begin
  perform private.require_user();
  select s.regulated into reg from public.skills s where s.key = p_skill;
  if reg is null then raise exception 'unknown skill' using errcode = '22023'; end if;
  if not reg then raise exception 'this skill does not need verification' using errcode = '22023'; end if;
  select p.wilaya_code into w from public.profiles p where p.id = p_target;
  if not found then raise exception 'user not found' using errcode = 'P0002'; end if;
  if not (public.is_ministry() or (w is not null and public.can_moderate(w))) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_approve then
    insert into public.skill_verifications as v (user_id, skill, verified_by, note)
    values (p_target, p_skill, auth.uid(), p_note)
    on conflict on constraint skill_verifications_pkey do update set verified_by = excluded.verified_by, verified_at = now(), note = excluded.note;
  else
    delete from public.skill_verifications v where v.user_id = p_target and v.skill = p_skill;
  end if;
  perform private.audit(case when p_approve then 'skill_verified' else 'skill_unverified' end, 'profile', p_target::text, w,
                        jsonb_build_object('skill', p_skill));
end $$;

-- Volunteers who can do at least one required skill: same wilaya, or anywhere when both the request and the
-- volunteer accept remote help. Regulated skills count only when verified. Never returns identities.
create or replace function private.skilled_volunteers(a public.alerts)
returns setof uuid language sql stable set search_path = '' as $$
  select p.id from public.profiles p
  where p.deleted_at is null
    and p.id is distinct from a.owner_id
    and (p.wilaya_code = a.wilaya_code or (a.remote_ok and p.remote_ok))
    and not exists (select 1 from public.alert_volunteers av where av.alert_id = a.id and av.user_id = p.id and av.status <> 'cancelled')
    and exists (
      select 1 from unnest(a.required_skills) rs(k) join public.skills s on s.key = rs.k
      where rs.k = any(p.skills)
        and (not s.regulated or exists (select 1 from public.skill_verifications v where v.user_id = p.id and v.skill = rs.k)))
  limit 200
$$;

create or replace function public.count_skilled_volunteers(alert uuid)
returns int language plpgsql stable security definer set search_path = '' as $$
declare a public.alerts;
begin
  perform private.require_user();
  select * into a from public.alerts where id = alert;
  if not found then raise exception 'alert not found' using errcode = 'P0002'; end if;
  if not public.can_moderate(a.wilaya_code) then raise exception 'not allowed' using errcode = '42501'; end if;
  return (select count(*) from private.skilled_volunteers(a));
end $$;

create or replace function public.notify_skilled_volunteers(alert uuid)
returns int language plpgsql volatile security definer set search_path = '' as $$
declare a public.alerts; n int;
begin
  perform private.require_user();
  select * into a from public.alerts where id = alert;
  if not found or a.status <> 'approved' or coalesce(array_length(a.required_skills, 1), 0) = 0 then
    raise exception 'alert not open or no skills required' using errcode = '22023';
  end if;
  if not public.can_moderate(a.wilaya_code) then raise exception 'not allowed' using errcode = '42501'; end if;
  if exists (select 1 from public.audit_log where action = 'notify_skilled' and entity_id = alert::text and created_at > now() - interval '6 hours') then
    raise exception 'volunteers already notified recently' using errcode = '22023';
  end if;
  insert into public.notifications (user_id, kind, title, body, link)
  select v, 'skill_request', 'مهارتك مطلوبة',
         a.title || ' — ' || array_to_string(a.required_skills, '، ') || case when a.remote_ok then ' (يمكن عن بُعد)' else '' end,
         '/?alert=' || a.id
  from private.skilled_volunteers(a) v;
  get diagnostics n = row_count;
  perform private.audit('notify_skilled', 'alert', alert::text, a.wilaya_code, jsonb_build_object('notified', n, 'skills', a.required_skills));
  return n;
end $$;

revoke all on function public.verify_skill(uuid, text, boolean, text) from public, anon;
revoke all on function public.count_skilled_volunteers(uuid) from public, anon;
revoke all on function public.notify_skilled_volunteers(uuid) from public, anon;
grant execute on function public.verify_skill(uuid, text, boolean, text) to authenticated;
grant execute on function public.count_skilled_volunteers(uuid) to authenticated;
grant execute on function public.notify_skilled_volunteers(uuid) to authenticated;
