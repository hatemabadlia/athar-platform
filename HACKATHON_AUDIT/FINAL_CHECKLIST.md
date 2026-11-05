# Final checklist (tick on presentation day)

## Security (before anything is public)
- [ ] Database password rotated (it was pasted in chat), new value in `.env.local` + Vercel
- [ ] Gemini key rotated (it was pasted in chat)
- [ ] `git check-ignore .env.local` → ignored; no key in any commit (`git log -p | grep -i "sb_secret\|AIza\|AQ\."` empty)

## Infrastructure
- [ ] Branch pushed to GitHub, tag `hackathon-v1`
- [ ] Deployed to Vercel (region near London), all env vars set (see `docs/CREDENTIALS_CHECKLIST.md`)
- [ ] Supabase → Auth → URL configuration: site URL + `/auth/callback`
- [ ] `BASE_URL=<public url> npm run demo:check` → **7/7**
- [ ] Map tiles visible on the public URL (OpenStreetMap)

## Data
- [ ] `npm run seed:demo` run the same morning (fresh "منذ X ساعة" times)
- [ ] Demo seed uses canonical skills (P0-4), so the volunteer sees skill reasons
- [ ] The chosen blood alert has **not** been notified in the last 6 h; the donor account is compatible and in the same wilaya
- [ ] `npm run ai:smoke` < 5 s per post, 1 hour before; a second free Gemini key ready

## Devices
- [ ] Laptop: tab A = moderator signed in; tab B = `/check`; zoom 110–125% for the projector
- [ ] Phone: donor signed in on the public URL, brightness max, notifications visible, screen mirroring tested
- [ ] Phone hotspot ready as backup internet
- [ ] Backup video (3 min) on the laptop desktop, playable offline

## Pitch
- [ ] Script rehearsed 3× with a timer (target 4:30)
- [ ] Opening line memorised (the Boufarik post)
- [ ] One architecture slide: "69 database security tests · AI never decides alone · phones masked"
- [ ] One evaluation slide with the **exact wording**: "30/30 verdicts on our labelled test set (Gemini Flash-Lite, Nov 2026)". If P1-5 is done, the real-post result.
- [ ] Honest status slide: working prototype, demo data, not yet used by real users; next step a one-wilaya pilot
- [ ] Jury Q&A (`presentation/ATHAR_JURY_QA_AR.md`) read by everyone on the team
- [ ] If possible: one support letter from an association, a دار الشباب or a blood centre

## Words to never say
"100% accurate" · "detects fraud" · "verified" for anything only the AI has seen · "real families helped"
