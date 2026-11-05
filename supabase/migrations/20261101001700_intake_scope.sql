-- Scope the intake queue to the moderator's wilaya once the pipeline has located the message.
-- Unlocated items (wilaya unknown) stay visible to all staff so nothing is lost.
alter table public.intake_items add column wilaya_code smallint references public.wilayas(code) on update cascade;
create index intake_items_wilaya_idx on public.intake_items (wilaya_code, received_at desc);

drop policy "staff read intake" on public.intake_items;
drop policy "staff update intake" on public.intake_items;
drop policy "staff read intake contacts" on public.intake_contacts;

create policy "staff read intake in scope" on public.intake_items for select to authenticated
  using ((select public.is_ministry()) or (wilaya_code is null and (select public.is_staff())) or (select public.can_moderate(wilaya_code)));
create policy "staff update intake in scope" on public.intake_items for update to authenticated
  using ((select public.is_ministry()) or (wilaya_code is null and (select public.is_staff())) or (select public.can_moderate(wilaya_code)))
  with check ((select public.is_staff()));
create policy "staff read intake contacts in scope" on public.intake_contacts for select to authenticated
  using (exists (select 1 from public.intake_items i where i.id = intake_item_id
                 and (public.is_ministry() or (i.wilaya_code is null and public.is_staff()) or public.can_moderate(i.wilaya_code))));

-- AI run logs: ministry only (they can contain extracted fields); wilaya staff see aggregates in the UI.
drop policy "staff read ai runs" on public.ai_runs;
create policy "ministry reads ai runs" on public.ai_runs for select to authenticated using ((select public.is_ministry()));
