/**
 * Runs the 30 labelled posts in tests/eval/darija-30.json through the real "Is this post real?" checker
 * (lib/pipeline/check.ts — Claude when ANTHROPIC_API_KEY is set) against the demo seed, and writes the
 * measured results to docs/AI_EVAL_RESULTS.md and tests/eval/last-run.json. Results are never edited by hand.
 *
 *   npm run seed:demo && npm run eval:ai
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { checkPost } from "@/lib/pipeline/check";
import type { VerifyStatus } from "@/lib/pipeline/verify";
import { WILAYAS } from "@/lib/wilayas";

type Case = { id: string; status: VerifyStatus; category: string | null; wilaya: number | null; ref: string | null; kind: string; text: string };
const { cases } = JSON.parse(readFileSync("tests/eval/darija-30.json", "utf8")) as { cases: Case[] };
const STATUSES: VerifyStatus[] = ["active", "resolved", "recycled", "suspicious", "insufficient"];
/** "Flagged" = should not be shared freely without checking first. */
const flagged = (s: VerifyStatus) => s === "resolved" || s === "recycled" || s === "suspicious";

async function main() {
  const rows: { c: Case; status: VerifyStatus | "error"; category: string | null; wilaya: number | null; ms: number; mode: string; model: string | null; error?: string }[] = [];
  for (const c of cases) {
    const t = performance.now();
    try {
      const r = await checkPost(c.text);
      rows.push({ c, status: r.status, category: r.understood.category, wilaya: wilayaCode(r.understood.wilaya), ms: Math.round(performance.now() - t), mode: r.mode, model: r.model });
    } catch (e) {
      rows.push({ c, status: "error", category: null, wilaya: null, ms: Math.round(performance.now() - t), mode: "-", model: null, error: String(e).slice(0, 120) });
    }
    const last = rows[rows.length - 1];
    console.log(`${last.status === c.status ? "✓" : "✗"} ${c.id.padEnd(6)} expected ${c.status.padEnd(12)} got ${String(last.status).padEnd(12)} ${last.ms} ms ${last.mode}`);
  }

  const n = rows.length;
  const ok = rows.filter((r) => r.status === r.c.status).length;
  const catOk = rows.filter((r) => r.category === r.c.category).length;
  const wilOk = rows.filter((r) => r.wilaya === r.c.wilaya).length;
  const fp = rows.filter((r) => r.status !== "error" && !flagged(r.c.status) && flagged(r.status));
  const fn = rows.filter((r) => flagged(r.c.status) && (r.status === "error" || !flagged(r.status)));
  const times = rows.map((r) => r.ms).sort((a, b) => a - b);
  const pct = (x: number) => `${Math.round((x / n) * 100)}%`;
  const modes = [...new Set(rows.map((r) => r.mode))].join(", ");
  const model = rows.find((r) => r.model)?.model ?? "none (rule-based)";
  const sha = (() => { try { return execSync("git rev-parse --short HEAD").toString().trim(); } catch { return "?"; } })();

  const confusion = STATUSES.map((exp) => `| ${exp} | ${STATUSES.map((got) => rows.filter((r) => r.c.status === exp && r.status === got).length).join(" | ")} | ${rows.filter((r) => r.c.status === exp && r.status === "error").length} |`);
  const perClass = STATUSES.map((s) => {
    const tp = rows.filter((r) => r.c.status === s && r.status === s).length;
    const pred = rows.filter((r) => r.status === s).length;
    const real = rows.filter((r) => r.c.status === s).length;
    return `| ${s} | ${real} | ${pred ? Math.round((tp / pred) * 100) + "%" : "–"} | ${real ? Math.round((tp / real) * 100) + "%" : "–"} |`;
  });

  const md = `# AI evaluation — "Is this post real?" (measured, not edited)

- Run: ${new Date().toISOString()} · commit \`${sha}\` · analysis mode: **${modes}** · model: **${model}**
- Data: \`tests/eval/darija-30.json\` (30 hand-labelled posts: Darija, MSA, Arabizi, French) against the demo seed (\`npm run seed:demo\`).
- Command: \`npm run eval:ai\`

## Headline

| Metric | Result |
|---|---|
| Verdict accuracy (5 classes) | **${ok}/${n} (${pct(ok)})** |
| Category accuracy | ${catOk}/${n} (${pct(catOk)}) |
| Wilaya accuracy | ${wilOk}/${n} (${pct(wilOk)}) |
| False positives (safe post flagged) | ${fp.length} |
| False negatives (resolved/recycled/suspicious post not flagged) | ${fn.length} |
| Time per post (median / p95 / max) | ${times[Math.floor(n / 2)]} ms / ${times[Math.floor(n * 0.95)]} ms / ${times[n - 1]} ms |
| Errors | ${rows.filter((r) => r.status === "error").length} |

## Per class

| Class | Cases | Precision | Recall |
|---|---|---|---|
${perClass.join("\n")}

## Confusion matrix (rows = expected, columns = got)

| expected \\ got | ${STATUSES.join(" | ")} | error |
|---|${STATUSES.map(() => "---").join("|")}|---|
${confusion.join("\n")}

## Every case

| id | kind | expected | got | category (exp → got) | wilaya (exp → got) | ms |
|---|---|---|---|---|---|---|
${rows.map((r) => `| ${r.c.id} | ${r.c.kind} | ${r.c.status} | ${r.status === r.c.status ? r.status : `**${r.status}**`} | ${r.c.category ?? "–"} → ${r.category ?? "–"} | ${r.c.wilaya ?? "–"} → ${r.wilaya ?? "–"} | ${r.ms} |`).join("\n")}
${fp.length || fn.length ? `\n## Errors to study\n\n${[...fp.map((r) => `- FP ${r.c.id}: expected ${r.c.status}, got ${r.status}`), ...fn.map((r) => `- FN ${r.c.id}: expected ${r.c.status}, got ${r.status}${r.error ? ` (${r.error})` : ""}`)].join("\n")}\n` : ""}`;
  writeFileSync("docs/AI_EVAL_RESULTS.md", md);
  writeFileSync("tests/eval/last-run.json", JSON.stringify({ at: new Date().toISOString(), sha, modes, model, rows: rows.map(({ c, ...r }) => ({ id: c.id, expected: c.status, ...r })) }, null, 2));
  console.log(`\nverdict accuracy ${ok}/${n} · category ${catOk}/${n} · wilaya ${wilOk}/${n} · FP ${fp.length} · FN ${fn.length} · mode ${modes}`);
}

// Checker returns the Arabic wilaya name; map back to its code for scoring.
function wilayaCode(nameAr: string | null): number | null {
  return nameAr ? WILAYAS.find((w) => w.nameAr === nameAr)?.code ?? null : null;
}

main().catch((e) => { console.error(e); process.exit(1); });
