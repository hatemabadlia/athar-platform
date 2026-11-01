# Demo script: realistic content created through the UI

Nothing here is seeded in code. Every row comes from real actions in the app, so the demo also proves the flows work. Use clearly fictional names and **numbers that cannot belong to real people** (for example `0555 00 00 01`). Delete the demo data afterwards with `npx supabase db reset` (local only).

Allow about 15 minutes, on a local stack (`npx supabase start`, `npm run build && npm start`). Login codes arrive in Mailpit at http://127.0.0.1:54324.

## 0. Accounts (4 browser profiles or private windows)

| Who | Email | Role |
|---|---|---|
| Ministry admin | `ministry@demo.local` | bootstrap with the SQL in the README |
| DJSL Alger | `djsl16@demo.local` | granted by the ministry in `/admin → الأدوار` (wilaya 16) |
| Volunteer | `volunteer@demo.local` | default |
| Association | `assoc@demo.local` | after verification |

## 1. Intake → AI → moderation (3 min)

1. Signed out, open `/submit` and paste: `نحتاجو متبرعين بالدم فصيلة O+ فسبيطار مصطفى باشا بالعاصمة قبل الخمسة، للتواصل 0555 00 00 01`. Tick consent and send.
2. As DJSL Alger, open `/ingest`. The submission appears in the live queue with its verdict and score. Paste the same text again: stage 5 or 6 flags it as a duplicate or recycled post.
3. Open `/admin`, then the alert. Show:
   - the original and MSA text;
   - the reasons behind the score;
   - "reveal phone", which is audited.

   Then approve the alert.
4. Open `/` in another window. The alert appears without a refresh (Realtime).

## 2. Volunteer journey (3 min)

1. As the volunteer, open `/profile` and set name, wilaya 16, blood type O- (with consent) and skills. "Suggested for you" lists the alert with the reason "compatible blood type".
2. Click "I can help" and accept. The contact number appears; points do **not** go up yet.
3. Open `/donors` and join the donor network.

## 3. Club, QR attendance and certificate (4 min)

1. As the volunteer (or a second account), go to `/clubs`, found a club, and create an activity.
2. On another account, open `/profile` to show the live QR (it expires in 5 minutes).
3. As the club lead, go to Lead panel → Record attendance, then scan with the camera or paste the token. The check-in is confirmed. Try the same token again: it is refused.
4. The volunteer's profile now shows 20 confirmed points and an hour count. Click "Issue certificate", print to PDF, then open `/verify/<id>` signed out: "valid certificate".

## 4. Crisis mode (2 min)

1. As DJSL Alger, go to `/admin → مراكز الإيواء` (shelters) and add a real-looking shelter (state that it's fictional during the demo) with status "open".
2. Go to `/admin → الطوارئ` (emergencies) and declare a flood with the SMS option on. The provider is "console", so nothing is sent; `sms_messages` records the attempt.
3. The red banner appears site-wide, and `/crisis/<id>` lists the open shelter.

## 5. Humanitarian modules (3 min)

1. As the association, go to `/associations` and apply with a PDF.
2. As DJSL, go to `/admin → الجمعيات` (associations) and verify it. The badge appears.
3. As the association, open `/campaigns` and create a Ramadan campaign. Register beneficiary ID `0555 00 00 09`, then the same number in `+213` format: "already registered".
4. Go to `/donations`. The volunteer posts an offer of winter clothes; the association posts a need. Propose the match, accept it, and the contact appears only then.

## 6. Transparency (1 min)

Open `/impact`, filter by wilaya 16, export CSV, and open the print view. Every number traces back to the actions above.
