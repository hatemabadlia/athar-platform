# AI evaluation — "Is this post real?" (measured, not edited)

- Run: 2026-11-04T22:59:07.044Z · commit `5e165ec` · analysis mode: **gemini** · model: **gemini-3.5-flash-lite**
- Data: `tests/eval/darija-30.json` (30 hand-labelled posts: Darija, MSA, Arabizi, French) against the demo seed (`npm run seed:demo`).
- Command: `npm run eval:ai`

## Headline

| Metric | Result |
|---|---|
| Verdict accuracy (5 classes) | **30/30 (100%)** |
| Category accuracy | 27/30 (90%) |
| Wilaya accuracy | 29/30 (97%) |
| False positives (safe post flagged) | 0 |
| False negatives (resolved/recycled/suspicious post not flagged) | 0 |
| Time per post (median / p95 / max) | 3224 ms / 19328 ms / 43164 ms |
| Errors | 0 |

## Per class

| Class | Cases | Precision | Recall |
|---|---|---|---|
| active | 6 | 100% | 100% |
| resolved | 5 | 100% | 100% |
| recycled | 5 | 100% | 100% |
| suspicious | 6 | 100% | 100% |
| insufficient | 8 | 100% | 100% |

## Confusion matrix (rows = expected, columns = got)

| expected \ got | active | resolved | recycled | suspicious | insufficient | error |
|---|---|---|---|---|---|---|
| active | 6 | 0 | 0 | 0 | 0 | 0 |
| resolved | 0 | 5 | 0 | 0 | 0 | 0 |
| recycled | 0 | 0 | 5 | 0 | 0 | 0 |
| suspicious | 0 | 0 | 0 | 6 | 0 | 0 |
| insufficient | 0 | 0 | 0 | 0 | 8 | 0 |

## Every case

| id | kind | expected | got | category (exp → got) | wilaya (exp → got) | ms |
|---|---|---|---|---|---|---|
| act-1 | reworded duplicate | active | active | blood → blood | 16 → 16 | 9341 |
| act-2 | reworded duplicate | active | active | blood → blood | 25 → 25 | 2863 |
| act-3 | reworded duplicate | active | active | cleanup → cleanup | 31 → 31 | 3224 |
| act-4 | reworded duplicate | active | active | blood → blood | 5 → 5 | 3765 |
| act-5 | reworded duplicate | active | active | relief → relief | 15 → 15 | 3481 |
| act-6 | reworded duplicate | active | active | orphans → education | 31 → 31 | 3140 |
| res-1 | old viral post, lightly edited | resolved | resolved | relief → relief | 9 → 9 | 2873 |
| res-2 | old post, exact | resolved | resolved | blood → blood | 31 → 31 | 4368 |
| res-3 | old post, reworded | resolved | resolved | cleanup → cleanup | 6 → 6 | 19328 |
| res-4 | closed request reposted | resolved | resolved | relief → relief | 9 → 9 | 43164 |
| res-5 | closed request reposted | resolved | resolved | blood → blood | 16 → 16 | 4593 |
| rec-1 | old viral post with money request | recycled | recycled | medical → medical | 25 → – | 2539 |
| rec-2 | old viral post, shortened | recycled | recycled | medical → medical | – → – | 4626 |
| rec-3 | duplicate of a request under review | recycled | recycled | medical → medical | 28 → 28 | 2919 |
| rec-4 | duplicate of a request under review | recycled | recycled | relief → relief | 16 → 16 | 2861 |
| rec-5 | same phone, different wording | recycled | recycled | medical → medical | 28 → 28 | 2285 |
| sus-1 | money transfer | suspicious | suspicious | orphans → orphans | 47 → 47 | 2593 |
| sus-2 | money transfer (BaridiMob) | suspicious | suspicious | medical → relief | – → – | 2113 |
| sus-3 | stale year, not in archive | suspicious | suspicious | relief → relief | 2 → 2 | 2254 |
| sus-4 | not a help request (sale) | suspicious | suspicious | – → – | 16 → 16 | 1919 |
| sus-5 | chain message, not a help request | suspicious | suspicious | – → – | – → – | 2137 |
| sus-6 | money + stale date | suspicious | suspicious | medical → medical | 19 → 19 | 2988 |
| ins-1 | new complete request | insufficient | insufficient | blood → blood | 31 → 31 | 4024 |
| ins-2 | new complete request | insufficient | insufficient | cleanup → cleanup | 23 → 23 | 16038 |
| ins-3 | new complete request | insufficient | insufficient | education → education | 30 → 30 | 10939 |
| ins-4 | new complete request | insufficient | insufficient | medical → relief | 13 → 13 | 4566 |
| ins-5 | incomplete (no place, no phone) | insufficient | insufficient | blood → blood | – → – | 2827 |
| ins-6 | incomplete | insufficient | insufficient | relief → relief | – → – | 4361 |
| ins-7 | Arabizi | insufficient | insufficient | blood → blood | 9 → 9 | 3502 |
| ins-8 | French | insufficient | insufficient | blood → blood | 19 → 19 | 2942 |
