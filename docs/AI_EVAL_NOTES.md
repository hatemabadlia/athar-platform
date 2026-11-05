# Notes on the AI evaluation (written by hand — the numbers live in AI_EVAL_RESULTS.md)

- **Not blind.** The 30 posts, their labels, the demo seed they are matched against, and the verdict rules were all written by the same team. The set checks that the pipeline behaves as designed end to end with a real model; it is not an independent accuracy study.
- **Small.** 30 posts. One error changes accuracy by ~3 points. Do not present the result as "100% accurate"; present it as "30/30 correct verdicts on our labelled test set (2026-11-04, Gemini 3.5 Flash-Lite)".
- **Verdicts vs fields.** Verdicts depend mostly on database matching (archive, active requests) and explicit warning signs; category/wilaya come from the model. Category errors seen: orphanage school supplies → education; money-transfer surgery → relief; wheelchair for an elderly man → relief. None changed the verdict.
- **Latency.** Median ~3 s. Outliers (19 s, 43 s) happen when the free tier is slow and the client falls back to another model.
- **Next step for credibility:** collect 50–100 real public posts (with permission or from public groups), label them by someone who did not write the rules, and re-run `npm run eval:ai` on that file.
