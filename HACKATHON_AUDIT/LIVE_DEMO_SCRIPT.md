# Live demo script (≈ 4 min 30 s)

**Setup:**
- Laptop on the projector + one phone (mirrored with QuickTime, or held up to a document camera).
- Signed in beforehand:
  - laptop tab A = **DJSL Algiers moderator** (`djsl16@demo.athar.dz`)
  - laptop tab B = anonymous / `/check`
  - phone = **donor** (a demo donor compatible with the chosen alert, e.g. `amina@demo.athar.dz` for an O- request in Algiers)
- Everything shown is real software on demo data. **Say once, clearly: "the people and phone numbers are fictional; every result you see is computed live."**

**Rules:**
- Never claim a real person was helped.
- Never fake an AI result.
- If the AI is slow, say what's happening.

---

### 0:00 Opening (no screen, 20 s)
> «كلنا شفنا هذا المنشور… "عائلة في بوفاريك دارهم طاحت، شاركو". شاركناه. لكن هل تعلمون أن هذه الحالة أُغلقت في جانفي 2021، وما زال المنشور يدور حتى اليوم؟ كل مشاركة له اليوم تُرسل متطوعين إلى حاجة لم تعد موجودة… بينما حالة حقيقية في نفس الحي لا يراها أحد. إيثار وُجدت لتفصل بين الاثنين.»

### 0:20 The problem in one screen (20 s)
- **Click:** tab B, the homepage.
- **Say:** «إيثار ليست منصة أخرى للنداءات. هي طبقة تحقق فوق فيسبوك وواتساب، حيث يطلب الجزائريون المساعدة فعلاً.»
- **Jury sees:** the hero, the counter "منشور قديم أو مكرر رُصد", the 4-step strip.

### 0:40 WOW 1: the recycled Darija post (50 s)
- **Click:** "افحص منشوراً وصلك" → paste the Boufarik post → "افحص المنشور".
- **Say while it runs (~3 s):** «إيثار يفهم الدارجة، يستخرج الولاية والهاتف، ويبحث في سجل المنشورات السابقة والمغلقة.»
- **Jury sees:** a blue card "هذا الطلب سبق حلّه" and "لا تُعِد نشره", then the evidence (first seen 2021-01-14, 47 times, same phone, closed 2021-01-20) and "ما فهمه إيثار" (the Darija rewritten into MSA).
- **Say (key line):** «لاحظوا: إيثار لا يقول "احتيال". يقول بالأدلة: هذه حالة أُغلقت. القرار للإنسان، والأسباب أمامه.»

### 1:30 A genuine request goes to the wilaya moderator (50 s)
- **Click:** "تحقّق" → paste a **new** Darija request (for example: `نحتاجو 3 متبرعين بالدم فصيلة O- فسبيطار بني مسوس بالعاصمة قبل الخامسة… 0555 00 04 xx`) → result: "لا توجد أدلة كافية" → **"أرسله ليراجعه مشرف الولاية"** → submit.
- **Switch to tab A** (`/admin`): the new request appears in the **Algiers** queue only. Open it.
- **Jury sees:** the original Darija, the MSA, the score with **every reason and its +/−**, "Gemini" labelled as the analyser.
- **Say:** «كل نداء يذهب لمشرف ولايته فقط — مشرف وهران لا يرى نداءات العاصمة. الذكاء الاصطناعي يقترح، الإنسان يقرّر.» → **Approve.**

### 2:20 WOW 2: the right donor's phone lights up (50 s)
- In the approved request: "عدّ المتبرعين المتوافقين" → "1 متبرع متوافق ومتاح" → **"إخطارهم"**.
- **Hold up the phone:** the red card "نداء دم متوافق مع فصيلتك" appears live.
- **Say:** «إيثار لم يرسل لكل الناس — أرسل فقط لمن فصيلته متوافقة طبياً وفي نفس الولاية. والمشرف لا يرى هوية المتبرعين: يرى عدداً فقط.»

### 3:10 QR: help that actually happened (40 s)
- **If P1-2 is built:** the moderator starts the mission check-in; the phone shows its QR (`/profile`); the laptop scans it → "confirmed".
- **Otherwise (honest fallback):** show a **club activity** QR check-in (`/clubs` lead panel), and say «نفس الآلية تُطبَّق على المهام».
- **Say:** «النقاط والشهادات لا تُمنح بنقرة — بل بحضور مؤكَّد. رمز QR موقَّع، صالح 5 دقائق، يُستعمل مرة واحدة.» Show the certificate page and `/verify` "شهادة صالحة".

### 3:50 Impact (25 s)
- **Click:** `/impact`.
- **Say:** «هذه أرقام تحسبها المنصة من سجلاتها — ساعات مؤكدة، نداءات أُغلقت، منشورات قديمة أُوقفت قبل أن تضيّع وقت أحد. اليوم بيانات تجريبية؛ غداً، أرقام ولاية حقيقية لمديرية الشباب.»

### 4:15 Closing (15 s)
> «الخير موجود في الجزائر. ما ينقصه هو الثقة. إيثار: تحقّق قبل أن تشارك.»

---

## Screens that must be polished
`/check` result · the admin request modal · the phone toast · the QR/certificate pages · `/impact`.

## Live vs prepared
- **Live:** `/check` (both posts), submit → moderator → approve, donor notification, QR scan.
- **Prepared:** the demo seed loaded the morning of the pitch (`npm run seed:demo`), all devices signed in, a tested chosen alert/donor pair (the 6 h throttle: **don't trigger the donor alert during rehearsal less than 6 h before the pitch**, or use another alert).

## Backups
1. A 3-minute screen recording of this exact script.
2. Screenshots in the deck.
3. A hotspot from a phone.
4. If the AI is down: the rules fallback still runs and the archive match (SQL) still says "سبق حلّه". Say «حتى بدون الذكاء الاصطناعي، سجل إيثار يكشف المنشور القديم».
