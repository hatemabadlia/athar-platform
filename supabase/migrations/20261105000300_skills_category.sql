-- Skills-based volunteering: a request category for non-material help (design, translation, consultation…).
-- Kept in its own migration: a new enum value cannot be used in the transaction that adds it.
alter type public.alert_category add value if not exists 'skills';
