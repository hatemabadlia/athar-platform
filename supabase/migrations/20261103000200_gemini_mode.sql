-- Allow the free Gemini provider to be recorded truthfully (alongside Claude and the rule-based fallback).
alter table public.alerts drop constraint if exists alerts_ai_mode_check;
alter table public.alerts add constraint alerts_ai_mode_check check (ai_mode in ('claude', 'gemini', 'heuristic', 'manual'));

alter table public.ai_runs drop constraint if exists ai_runs_mode_check;
alter table public.ai_runs add constraint ai_runs_mode_check check (mode in ('claude', 'gemini', 'heuristic', 'embedding', 'chatbot'));
