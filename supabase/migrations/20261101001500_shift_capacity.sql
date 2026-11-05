-- Shift capacity is enforced in the database (RLS hides other people's sign-ups from volunteers).
create or replace function public.shift_taken(shift uuid)
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.shift_signups where shift_id = shift;
$$;
grant execute on function public.shift_taken(uuid) to anon, authenticated;

create or replace function private.enforce_shift_capacity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cap int;
begin
  select capacity into cap from public.campaign_shifts where id = new.shift_id for update;
  if (select count(*) from public.shift_signups where shift_id = new.shift_id) >= cap then
    raise exception 'shift full' using errcode = '22023';
  end if;
  return new;
end $$;
create trigger shift_capacity before insert on public.shift_signups for each row execute function private.enforce_shift_capacity();
