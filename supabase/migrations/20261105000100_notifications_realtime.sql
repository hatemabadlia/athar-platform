-- Deliver in-app notifications live (e.g. "compatible blood donor needed"). Realtime applies the
-- existing RLS policy "own notifications", so each user only receives their own rows.
alter publication supabase_realtime add table public.notifications;
