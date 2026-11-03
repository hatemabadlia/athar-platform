/**
 * Quick live check of the configured AI provider (no database needed): runs three posts through
 * stages 2–4 and the sanitiser, and prints what came back.  npm run ai:smoke
 */
import { aiProvider } from "@/lib/pipeline/provider";
import { sanitizeAnalysis } from "@/lib/pipeline/sanitize";

const POSTS = [
  "خاوتي عاجل نحتاجو 4 متبرعين بالدم فصيلة O- فسبيطار مصطفى باشا بالعاصمة، عملية غدوة الصباح. اللي يقدر يجي يتصل 0555 00 02 01",
  "khawti nhtajo donneurs de sang groupe O+ f sbitar Blida lyoum, li yqder yji 0555 00 03 07",
  "دار أيتام في غرداية تحتاج مساعدتكم، حولو التبرعات على الحساب البريدي CCP 0000000 مفتاح 99 باسم المسؤول",
];

async function main() {
  const p = aiProvider();
  if (!p) { console.log("No AI provider configured (set ANTHROPIC_API_KEY or GEMINI_API_KEY)."); return; }
  for (const text of POSTS) {
    const t = performance.now();
    const r = await p.analyze(text);
    const a = sanitizeAnalysis(r.analysis, text).analysis;
    console.log(JSON.stringify({ provider: p.name, model: r.model, ms: Math.round(performance.now() - t), tokens: [r.inputTokens, r.outputTokens],
      category: a.category, urgency: a.urgency, wilaya: a.wilaya_code, blood: a.blood_type, phones: a.phone_numbers.length, money: a.money_request,
      help: a.is_help_request, confidence: a.confidence, title: a.title, msa: a.normalized_text.slice(0, 90), terms: a.darija_terms.slice(0, 4) }));
  }
}
main().catch((e) => { console.error("FAILED:", e instanceof Error ? e.message : e); process.exit(1); });
