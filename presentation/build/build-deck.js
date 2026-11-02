// Builds presentation/ATHAR_HACKATHON_AR.pptx — editable, Arabic RTL, 16:9.
// All text and diagrams are native PowerPoint objects; images are only backgrounds, the dot map and
// real screenshots of the prototype (clearly labelled).
const pptxgen = require("pptxgenjs");
const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");

const A = (p) => path.resolve(__dirname, "../ASSETS", p);
const OUTFILE = path.resolve(__dirname, "../ATHAR_HACKATHON_AR.pptx");
const REPO_URL = "https://github.com/hatemabadlia/athar-platform";

const C = { bg: "090E1A", navy: "101B2D", navy2: "16243A", cyan: "00D4FF", purple: "DA70D6", white: "F5F7FA", muted: "AAB6C5", line: "24344F" };
const FONT = "Tajawal";
const W = 13.333, H = 7.5, M = 0.6;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.rtlMode = true;
pres.title = "إيثار — منصة الذكاء التطوعي والاستجابة الإنسانية";
pres.author = "فريق إيثار";
pres.subject = "عرض الهاكاثون";
pres.theme = { headFontFace: FONT, bodyFontFace: FONT };

pres.defineSlideMaster({
  title: "ATHAR_DARK",
  background: { color: C.bg },
  objects: [],
  slideNumber: { x: 0.35, y: 7.02, w: 0.6, h: 0.3, fontFace: FONT, fontSize: 10, color: C.muted, align: "left" },
});

// ---------- helpers ----------
const ar = (o = {}) => ({ fontFace: FONT, rtlMode: true, lang: "ar-DZ", align: "right", valign: "top", margin: 0, isTextBox: true, color: C.white, ...o });
function text(slide, t, o) {
  const base = ar(o);
  // pptxgenjs reads rtl from the FIRST run of each line: push RTL/lang/font into every run
  const runs = Array.isArray(t) ? t.map((r) => ({ text: r.text, options: { rtlMode: base.rtlMode, lang: base.lang, fontFace: FONT, ...r.options } })) : t;
  slide.addText(runs, base);
}
function title(slide, t, sub) {
  const len = Array.isArray(t) ? t.map((r) => r.text).join("").length : t.length;
  text(slide, t, { x: M, y: 0.48, w: W - 2 * M, h: 0.95, fontSize: len > 46 ? 26 : 32, bold: true, valign: "middle" });
  if (sub) text(slide, sub, { x: M, y: 1.38, w: W - 2 * M, h: 0.45, fontSize: 16, color: C.muted });
}
function bg(slide, file) { slide.addImage({ path: A(`gen/${file}`), x: 0, y: 0, w: W, h: H, altText: "خلفية زخرفية" }); }
function card(slide, x, y, w, h, o = {}) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: o.r ?? 0.12, fill: { color: o.fill ?? C.navy, transparency: o.t ?? 0 }, line: { color: o.line ?? C.line, width: o.lw ?? 1 }, objectName: o.name });
}
function pill(slide, t, x, y, w, color, o = {}) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.34, rectRadius: 0.17, fill: { color, transparency: o.t ?? 82 }, line: { color, width: 1 } });
  text(slide, t, { x, y, w, h: 0.34, fontSize: 11.5, bold: true, color: o.textColor ?? color, align: "center", valign: "middle" });
}
function circleNum(slide, n, x, y, d, color) {
  slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color, transparency: 80 }, line: { color, width: 1.5 } });
  text(slide, String(n), { x, y, w: d, h: d, fontSize: d * 22, bold: true, color, align: "center", valign: "middle", rtlMode: false });
}
function framedImage(slide, file, x, y, w, h, alt = "لقطة شاشة من النموذج الأولي لإيثار") {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x - 0.06, y: y - 0.06, w: w + 0.12, h: h + 0.12, rectRadius: 0.1, fill: { color: C.navy2 }, line: { color: C.line, width: 1 },
    shadow: { type: "outer", color: "000000", opacity: 0.45, blur: 14, offset: 4, angle: 90 } });
  slide.addImage({ path: A(file), x, y, w, h, altText: alt });
}
const notes = (slide, s) => slide.addNotes(s);

// =====================================================================
// 01 — HOOK
{
  const s = pres.addSlide({ masterName: "ATHAR_DARK" });
  bg(s, "bg-hook.png");
  text(s, [
    { text: "ماذا لو كان هناك شخص يحتاج إلى ", options: {} },
    { text: "قطرة دم", options: { color: C.cyan } },
    { text: " الآن…", options: { breakLine: true } },
    { text: "وهناك متبرّع مستعدّ لإنقاذه،", options: { breakLine: true } },
    { text: "لكنهما ", options: {} },
    { text: "لا يعرفان", options: { color: C.purple } },
    { text: " بوجود بعضهما؟", options: {} },
  ], { x: 1.2, y: 1.15, w: 11.5, h: 3.6, fontSize: 44, bold: true, lineSpacingMultiple: 1.25, valign: "middle" });
  text(s, "يحتاج", { x: 5.25, y: 6.12, w: 1.0, h: 0.35, fontSize: 14, color: C.cyan, align: "center" });
  text(s, "مستعدّ", { x: 7.1, y: 6.12, w: 1.0, h: 0.35, fontSize: 14, color: C.purple, align: "center" });
  s.addImage({ altText: "شعار إيثار", path: A("gen/logo.png"), x: 12.05, y: 6.62, w: 0.55, h: 0.55 });
  text(s, [{ text: "إيثار", options: { bold: true, color: C.white } }, { text: " — عندما يتحوّل الخير إلى أثر", options: { color: C.muted } }],
    { x: 6.0, y: 6.68, w: 5.9, h: 0.45, fontSize: 20, valign: "middle" });
  notes(s, "ابدأ بالصمت ثانيتين ثم اطرح السؤال ببطء. لا تذكر المنصة قبل الجملة الأخيرة.");
}

// 02 — PROBLEM
{
  const s = pres.addSlide({ masterName: "ATHAR_DARK" });
  bg(s, "bg-dark-a.png");
  title(s, "الخير موجود… لكن الوصول إليه ليس دائماً سهلاً");
  s.addImage({ altText: "رسم: أطراف متفرقة وروابط مقطوعة", path: A("gen/fragmented.png"), x: 0.7, y: 1.95, w: 5.2, h: 4.48 });
  text(s, "معلومات متفرّقة، وأطراف لا تلتقي", { x: 0.7, y: 6.55, w: 5.2, h: 0.4, fontSize: 13, color: C.muted, align: "center" });
  const items = [
    "طلبات المساعدة منتشرة في مجموعات التواصل الاجتماعي",
    "يصعب التأكّد من مصداقية بعض النداءات",
    "يصعب الوصول إلى المتطوّع المناسب في الوقت المناسب",
    "غياب التنسيق بين المبادرات والجمعيات",
    "ضياع المعلومات وتكرار الطلبات نفسها",
    "صعوبة قياس الأثر الحقيقي للمبادرات",
  ];
  items.forEach((t, i) => {
    const y = 2.0 + i * 0.75;
    card(s, 6.45, y, 6.28, 0.6, { fill: C.navy, t: 15 });
    circleNum(s, i + 1, 12.2, y + 0.11, 0.38, i % 2 ? C.purple : C.cyan);
    text(s, t, { x: 6.65, y, w: 5.4, h: 0.6, fontSize: 17, valign: "middle" });
  });
  notes(s, "لا أرقام هنا عمداً: نصف المشكلة كما نلاحظها، دون إحصاءات غير موثّقة.");
}

// 03 — HUMAN STORY
{
  const s = pres.addSlide({ masterName: "ATHAR_DARK" });
  bg(s, "bg-dark-b.png");
  title(s, "وراء كل نداء… إنسان ينتظر");
  pill(s, "سيناريو توضيحي — ليس حالة حقيقية", 9.73, 1.45, 3.0, C.purple);
  const cards = [
    ["عائلة تحتاج دعماً عاجلاً", "نشرت نداءها في مجموعة على فيسبوك… فضاع بين عشرات المنشورات.", C.cyan],
    ["متطوّع يملك الوقت والوسيلة", "لم يرَ النداء، لأنه ليس عضواً في تلك المجموعة.", C.white],
    ["جمعية مستعدّة للمساعدة", "وصلها النداء بعد أيام، عبر رسالة مُعاد توجيهها.", C.purple],
  ];
  const cw = 3.55, gap = 0.74, y = 2.05, ch = 3.0;
  cards.forEach(([h, d, col], i) => {
    const x = W - M - cw - i * (cw + gap);
    card(s, x, y, cw, ch, { fill: C.navy, line: col === C.white ? C.line : col, lw: 1.2 });
    s.addShape(pres.shapes.OVAL, { x: x + cw - 0.95, y: y + 0.3, w: 0.62, h: 0.62, fill: { color: col, transparency: 78 }, line: { color: col, width: 1.5 } });
    text(s, String(i + 1), { x: x + cw - 0.95, y: y + 0.3, w: 0.62, h: 0.62, fontSize: 20, bold: true, color: col, align: "center", valign: "middle", rtlMode: false });
    text(s, h, { x: x + 0.3, y: y + 1.05, w: cw - 0.6, h: 0.8, fontSize: 19, bold: true, valign: "top" });
    text(s, d, { x: x + 0.3, y: y + 1.9, w: cw - 0.6, h: 1.0, fontSize: 15, color: C.muted, lineSpacingMultiple: 1.15, valign: "top" });
    if (i < 2) {
      const lx = x - gap + 0.12;
      s.addShape(pres.shapes.LINE, { x: lx, y: y + ch / 2, w: gap - 0.24, h: 0, line: { color: C.muted, width: 2, dashType: "dash" } });
      text(s, "✕", { x: lx + (gap - 0.24) / 2 - 0.15, y: y + ch / 2 - 0.42, w: 0.3, h: 0.3, fontSize: 13, color: C.purple, align: "center", rtlMode: false });
    }
  });
  card(s, M, 5.35, W - 2 * M, 1.25, { fill: C.navy2, line: C.navy2 });
  text(s, [
    { text: "المشكلة ليست دائماً في غياب المتطوّعين…", options: { breakLine: true } },
    { text: "بل أحياناً في غياب ", options: {} }, { text: "حلقة الوصل", options: { color: C.cyan } }, { text: ".", options: {} },
  ], { x: M + 0.3, y: 5.38, w: W - 2 * M - 0.6, h: 1.2, fontSize: 24, bold: true, align: "center", valign: "middle" });
  notes(s, "قلها كقصة. أكّد أنها مثال توضيحي، وليست حالة مستفيد حقيقي.");
}

// 04 — SOLUTION (ecosystem)
{
  const s = pres.addSlide({ masterName: "ATHAR_DARK" });
  bg(s, "bg-dark-a.png");
  title(s, "إيثار: منصة واحدة تربط المحتاج بالمتطوّع والجمعية", "منصة تنسيق إنساني ذكية، مصمّمة للجزائر");
  const cx = W / 2, cy = 4.18, R = 2.05;
  const nodes = ["المحتاجون", "المتطوّعون", "الجمعيات", "نوادي الشباب", "المتبرّعون بالدم", "المؤسسات والجهات المسؤولة"];
  nodes.forEach((n, i) => {
    const ang = (-90 + i * 60) * Math.PI / 180;
    const nx = cx + Math.cos(ang) * R * 2.05, ny = cy + Math.sin(ang) * R;
    s.addShape(pres.shapes.LINE, { x: Math.min(cx, nx), y: Math.min(cy, ny), w: Math.abs(nx - cx) || 0.001, h: Math.abs(ny - cy) || 0.001,
      flipH: (nx < cx) !== (ny < cy), line: { color: i % 2 ? C.purple : C.cyan, width: 1.5, transparency: 35 } });
  });
  nodes.forEach((n, i) => {
    const ang = (-90 + i * 60) * Math.PI / 180;
    const nx = cx + Math.cos(ang) * R * 2.05, ny = cy + Math.sin(ang) * R;
    const w = n.length > 14 ? 3.1 : 2.35, h = 0.66, col = i % 2 ? C.purple : C.cyan;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: nx - w / 2, y: ny - h / 2, w, h, rectRadius: 0.33, fill: { color: C.navy }, line: { color: col, width: 1.5 } });
    text(s, n, { x: nx - w / 2, y: ny - h / 2, w, h, fontSize: 17, bold: true, align: "center", valign: "middle" });
  });
  s.addShape(pres.shapes.OVAL, { x: cx - 1.05, y: cy - 1.05, w: 2.1, h: 2.1, fill: { color: C.cyan, transparency: 88 }, line: { color: C.cyan, width: 2 } });
  s.addImage({ altText: "شعار إيثار", path: A("gen/logo.png"), x: cx - 0.38, y: cy - 0.72, w: 0.76, h: 0.76 });
  text(s, "إيثار", { x: cx - 1.0, y: cy + 0.1, w: 2.0, h: 0.55, fontSize: 26, bold: true, align: "center" });
  text(s, [{ text: "من نداء متفرّق… ", options: { color: C.muted } }, { text: "إلى استجابة منظّمة", options: { color: C.cyan } }],
    { x: M, y: 6.72, w: W - 2 * M, h: 0.5, fontSize: 24, bold: true, align: "center" });
  notes(s, "هنا تكشف إيثار لأول مرة: حلقة الوصل بين كل الأطراف.");
}

// 05 — HOW IT WORKS
{
  const s = pres.addSlide({ masterName: "ATHAR_DARK" });
  bg(s, "bg-dark-b.png");
  title(s, "من طلب المساعدة إلى وصولها… في مسار واضح");
  const steps = [
    ["استقبال الطلب", "استمارة، تيليغرام، واتساب، أو مشرف", C.cyan],
    ["تحليل بالذكاء الاصطناعي", "فهم الدارجة واستخراج المعلومات", C.purple],
    ["تحقّق ومراجعة بشرية", "مشرف الولاية يعتمد أو يصحّح أو يرفض", C.white],
    ["مطابقة ذكية", "حسب الولاية والمهارة وفصيلة الدم", C.cyan],
    ["متابعة وتوثيق الأثر", "حضور مؤكَّد برمز QR وتقارير", C.purple],
  ];
  const sw = 2.18, gap = 0.31, y = 2.2;
  steps.forEach(([h, d, col], i) => {
    const x = W - M - sw - i * (sw + gap);
    circleNum(s, i + 1, x + sw / 2 - 0.42, y, 0.84, col === C.white ? C.cyan : col);
    card(s, x, y + 1.08, sw, 2.05, { fill: C.navy, line: col === C.white ? C.cyan : C.line, lw: col === C.white ? 2 : 1 });
    text(s, h, { x: x + 0.15, y: y + 1.25, w: sw - 0.3, h: 0.75, fontSize: 18, bold: true, align: "center", valign: "middle" });
    text(s, d, { x: x + 0.15, y: y + 2.02, w: sw - 0.3, h: 0.95, fontSize: 14, color: C.muted, align: "center" });
    if (i < 4) s.addShape(pres.shapes.LINE, { x: x - gap + 0.04, y: y + 0.42, w: gap - 0.08, h: 0, line: { color: C.muted, width: 1.5, endArrowType: "triangle" }, flipH: true });
  });
  card(s, M + 1.4, 5.85, W - 2 * M - 2.8, 0.85, { fill: C.purple, t: 85, line: C.purple });
  text(s, [{ text: "الذكاء الاصطناعي يساعد… ", options: { color: C.white } }, { text: "والقرار الحسّاس يبقى بيد مشرف بشري", options: { color: C.purple } }],
    { x: M + 1.5, y: 5.85, w: W - 2 * M - 3.0, h: 0.85, fontSize: 20, bold: true, align: "center", valign: "middle" });
  notes(s, "مرّ على الخطوات بسرعة: من اليمين إلى اليسار. ركّز على الخطوة الثالثة: الإنسان يقرّر.");
}

// 06 — AI INNOVATION
{
  const s = pres.addSlide({ masterName: "ATHAR_DARK" });
  bg(s, "bg-dark-a.png");
  title(s, "الذكاء الاصطناعي لا يكتفي بقراءة النداء… بل يساعد على فهمه");
  // right column: illustrative example
  const rx = 7.0, rw = W - M - rx;
  pill(s, "مثال توضيحي", W - M - 1.6, 1.62, 1.6, C.purple);
  card(s, rx, 2.1, rw, 1.05, { fill: C.navy2 });
  text(s, "النص الأصلي (بالدارجة)", { x: rx + 0.25, y: 2.17, w: rw - 0.5, h: 0.3, fontSize: 12, color: C.muted });
  text(s, "«رانا نحتاجو متبرّعين بالدم في تبسة، الحالة مستعجلة.»", { x: rx + 0.25, y: 2.47, w: rw - 0.5, h: 0.55, fontSize: 18, bold: true, color: C.cyan });
  text(s, "↓", { x: rx, y: 3.17, w: rw, h: 0.35, fontSize: 20, color: C.muted, align: "center", rtlMode: false });
  card(s, rx, 3.55, rw, 2.45, { fill: C.navy, line: C.cyan });
  const rows = [["نوع الطلب", "تبرّع بالدم", C.white], ["الموقع", "ولاية تبسة", C.white], ["الأولوية", "عاجلة", C.purple], ["المعلومات الناقصة", "الفصيلة ورقم الاتصال — يُطلب التحقّق", C.muted], ["الحالة", "في انتظار مراجعة مشرف", C.cyan]];
  rows.forEach(([k, v, col], i) => {
    const yy = 3.68 + i * 0.45;
    text(s, k, { x: rx + rw - 2.0, y: yy, w: 1.75, h: 0.4, fontSize: 14, color: C.muted, valign: "middle" });
    text(s, v, { x: rx + 0.25, y: yy, w: rw - 2.4, h: 0.4, fontSize: 15, bold: true, color: col, valign: "middle" });
  });
  const caps = ["فهم الدارجة", "استخراج المعلومات", "نوع المساعدة", "الولاية والبلدية", "درجة الاستعجال", "كشف التكرار", "أسباب المصداقية"];
  caps.forEach((c, i) => {
    const per = 4, col = i % per, row = Math.floor(i / per);
    const cw = (rw - 0.3) / per;
    const x = rx + rw - (col + 1) * cw - col * 0.1 + 0.3, yy = 6.18 + row * 0.42;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: yy, w: cw - 0.05, h: 0.34, rectRadius: 0.17, fill: { color: C.navy2 }, line: { color: C.line, width: 1 } });
    text(s, c, { x, y: yy, w: cw - 0.05, h: 0.34, fontSize: 11.5, color: C.white, align: "center", valign: "middle" });
  });
  // left column: real screenshots
  framedImage(s, "gen/pipeline-steps.png", 0.75, 1.85, 5.55, 3.49);
  framedImage(s, "gen/duplicate-steps.png", 0.75, 5.47, 5.55, 1.15);
  text(s, "لقطات حقيقية من النموذج الأولي: المراحل السبع، ثم كشف نداء مكرّر — وضع القواعد دون مفتاح Claude",
    { x: 0.75, y: 6.7, w: 5.55, h: 0.5, fontSize: 10.5, color: C.muted, align: "center" });
  notes(s, "المثال على اليمين توضيحي. اللقطات على اليسار حقيقية من النموذج الأولي. الذكاء الاصطناعي يقترح ولا يتحقّق من حالة طبية بمفرده.");
}

// 07 — PLATFORM EXPERIENCE
{
  const s = pres.addSlide({ masterName: "ATHAR_DARK" });
  bg(s, "bg-dark-b.png");
  title(s, "كل الخدمات الإنسانية… في تجربة واحدة", "لقطات حقيقية من النموذج الأولي — ببيانات تجريبية أُدخلت عبر الواجهة");
  const shots = [
    { f: "gen/alerts-list-top.png", x: 9.55, y: 2.05, w: 3.1, h: 4.16, cap: "النداءات المعتمدة مع سبب الاقتراح" },
    { f: "gen/moderation-modal.png", x: 4.95, y: 2.05, w: 4.25, h: 3.85, cap: "لوحة المشرف: النص الأصلي، الأسباب، القرار" },
    { f: "gen/campaign-top.png", x: 0.75, y: 2.05, w: 3.85, h: 2.92, cap: "حملة تضامنية: تقدّم فعلي ومنع تكرار المستفيد" },
  ];
  shots.forEach((sh) => {
    framedImage(s, sh.f, sh.x, sh.y, sh.w, sh.h);
    text(s, sh.cap, { x: sh.x - 0.1, y: sh.y + sh.h + 0.14, w: sh.w + 0.2, h: 0.35, fontSize: 12, color: C.muted, align: "center" });
  });
  framedImage(s, "screens/qr-card.png", 1.95, 5.48, 1.45, 1.21);
  text(s, "بطاقة حضور موقّعة (QR)", { x: 0.6, y: 5.85, w: 1.25, h: 0.6, fontSize: 11, color: C.muted, align: "center" });
  notes(s, "اذكر أن الخريطة موجودة في المنصة، لكنها لا تظهر في اللقطات لأن بيئة التصوير لم تصل إلى خوادم الخرائط.");
}

// 08 — DIFFERENTIATION
{
  const s = pres.addSlide({ masterName: "ATHAR_DARK" });
  bg(s, "bg-dark-a.png");
  title(s, "لسنا مجرد منصة إعلانات… نحن نظام لتنسيق الاستجابة الإنسانية");
  const rows = [
    ["استقبال الطلبات", "منشورات ورسائل متفرّقة", "طابور واحد لكل القنوات"],
    ["تنظيم المعلومات", "نص حرّ يصعب البحث فيه", "حقول منظّمة: الفئة، الولاية، الاستعجال"],
    ["اكتشاف التكرار", "قد يُعاد نشر النداء بعد انتهاء الحاجة", "مقارنة تلقائية بالأرشيف والنداءات النشطة"],
    ["التحقّق البشري", "لا جهة واضحة للمراجعة", "مشرف لكل ولاية وسجلّ تدقيق"],
    ["مطابقة المتطوّعين", "من يرى المنشور صدفةً", "اقتراح حسب الولاية والمهارة والفصيلة"],
    ["متابعة الأنشطة", "لا نعرف من حضر فعلاً", "حضور مؤكَّد برمز QR موقّع"],
    ["قياس الأثر", "انطباعات وتقديرات", "أرقام محسوبة من سجلات فعلية"],
  ];
  const xD = 9.75, wD = 2.98, xO = 5.6, wO = 3.95, xA = M, wA = 4.8, y0 = 1.72, rh = 0.66;
  text(s, "الطريقة المتفرّقة اليوم", { x: xO, y: y0, w: wO, h: 0.4, fontSize: 15, bold: true, color: C.muted, align: "center" });
  card(s, xA, y0 - 0.05, wA, 0.5, { fill: C.cyan, t: 85, line: C.cyan });
  text(s, "مع إيثار", { x: xA, y: y0 - 0.05, w: wA, h: 0.5, fontSize: 17, bold: true, color: C.cyan, align: "center", valign: "middle" });
  rows.forEach(([d, o, a], i) => {
    const y = y0 + 0.6 + i * rh;
    card(s, M, y, W - 2 * M, rh - 0.08, { fill: i % 2 ? C.navy : C.navy2, line: i % 2 ? C.navy : C.navy2, r: 0.08 });
    text(s, d, { x: xD, y, w: wD - 0.2, h: rh - 0.08, fontSize: 16, bold: true, valign: "middle" });
    text(s, o, { x: xO, y, w: wO, h: rh - 0.08, fontSize: 14, color: C.muted, valign: "middle", align: "center" });
    text(s, a, { x: xA + 0.15, y, w: wA - 0.5, h: rh - 0.08, fontSize: 14.5, valign: "middle" });
    text(s, "✓", { x: xA + wA - 0.42, y, w: 0.3, h: rh - 0.08, fontSize: 16, bold: true, color: C.cyan, valign: "middle", rtlMode: false });
  });
  notes(s, "لا نقارن بمنصات منافسة بالاسم؛ نقارن بالطريقة المتفرّقة الحالية التي يعرفها الجميع.");
}

// 09 — ECOSYSTEM MODULES
{
  const s = pres.addSlide({ masterName: "ATHAR_DARK" });
  bg(s, "bg-dark-b.png");
  title(s, "من التطوّع الفردي إلى العمل الإنساني المنظّم");
  const mods = [
    ["شبكة المتبرّعين بالدم", "تسجيل بموافقة، توافق الفصائل، إخطار دون كشف الهوية", 0],
    ["التبرّعات العينية", "عروض ⇄ احتياجات، والرقم يُكشف بعد القبول فقط", 0],
    ["دليل الجمعيات المعتمدة", "رقم الاعتماد والوثائق وتحقّق المديرية", 0],
    ["الحملات التضامنية", "قفة رمضان، الدخول المدرسي، الشتاء… دون تكرار المستفيد", 0],
    ["إدارة الأزمات والملاجئ", "إعلان طوارئ، مراكز حقيقية، تأكيد التوفّر", 1],
    ["التطوّع والأنشطة", "نوادٍ وأنشطة وحضور برمز QR", 0],
    ["الشهادات وساعات التطوّع", "ساعات مؤكَّدة فقط، وشهادة قابلة للتحقّق", 0],
    ["تقارير الأثر", "إحصاءات وطنية وولائية قابلة للتصدير", 0],
  ];
  const cw = 2.86, ch = 2.1, gx = 0.23, gy = 0.25, y0 = 1.7;
  mods.forEach(([h, d, st], i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = W - M - cw - col * (cw + gx), y = y0 + row * (ch + gy);
    card(s, x, y, cw, ch, { fill: C.navy });
    text(s, String(i + 1).padStart(2, "0"), { x: x + 0.2, y: y + 0.18, w: 0.7, h: 0.4, fontSize: 18, bold: true, color: row ? C.purple : C.cyan, align: "left", rtlMode: false });
    text(s, h, { x: x + 0.85, y: y + 0.18, w: cw - 1.05, h: 0.75, fontSize: 16, bold: true, valign: "top" });
    text(s, d, { x: x + 0.2, y: y + 0.92, w: cw - 0.4, h: 0.65, fontSize: 12.5, color: C.muted, lineSpacingMultiple: 1.05, valign: "top" });
    pill(s, st ? "مطوَّر — SMS بانتظار مزوّد" : "مطوَّر ومختبَر محلياً", x + 0.15, y + ch - 0.48, cw - 0.3, st ? C.purple : C.cyan, { t: 85 });
  });
  text(s, "«محلياً» تعني: يعمل على بيئة تطوير مع اختبارات آلية — لم يُطلق للعموم بعد.", { x: M, y: 6.72, w: W - 2 * M, h: 0.35, fontSize: 12, color: C.muted, align: "center" });
  notes(s, "كل الوحدات الثماني مبنية في النموذج الأولي، لكنها لم تُجرَّب بعد مع مستخدمين حقيقيين. قلها بوضوح.");
}

// 10 — IMPACT ON ALGERIA
{
  const s = pres.addSlide({ masterName: "ATHAR_DARK" });
  bg(s, "bg-dark-a.png");
  title(s, "أثر محلّي… ورؤية وطنية");
  s.addImage({ altText: "خريطة نقطية لمقرات ولايات الجزائر", path: A("gen/algeria-network.png"), x: 0.55, y: 1.55, w: 5.2, h: 4.83 });
  text(s, "كل نقطة مقرّ ولاية (إحداثيات تقريبية من بيانات المنصة). 58 ولاية مُدرجة؛ الولايات الجديدة تُضاف بعد التحقّق من ترقيمها الرسمي.",
    { x: 0.55, y: 6.42, w: 5.2, h: 0.6, fontSize: 11, color: C.muted, align: "center" });
  const levels = [["المواطن", "نداؤه يصل إلى من يستطيع المساعدة"], ["البلدية", "تنسيق المتطوّعين والجمعيات المحلية"], ["الولاية", "مشرف ولائي ورؤية موحّدة للطلبات"], ["الوطني", "لوحة شفافية ومؤشّرات قابلة للتصدير"]];
  levels.forEach(([h, d], i) => {
    const y = 1.75 + i * 0.78, w = 3.6 + i * 0.75;
    card(s, W - M - w, y, w, 0.66, { fill: i % 2 ? C.purple : C.cyan, t: 86, line: i % 2 ? C.purple : C.cyan });
    text(s, h, { x: W - M - 1.45, y, w: 1.3, h: 0.66, fontSize: 17, bold: true, color: i % 2 ? C.purple : C.cyan, valign: "middle" });
    text(s, d, { x: W - M - w + 0.2, y, w: w - 1.75, h: 0.66, fontSize: 14, valign: "middle" });
  });
  text(s, "مؤشّرات ستُقاس عند التبنّي — لا نعرض أرقاماً قبل وجود بيانات حقيقية", { x: 6.2, y: 4.98, w: W - M - 6.2, h: 0.35, fontSize: 14, bold: true, color: C.muted });
  const metrics = ["طلبات تمّ التحقّق منها", "متطوّعون نشطون", "مبادرات مكتملة", "ساعات تطوّع مؤكَّدة", "تبرّعات موثّقة", "زمن الاستجابة"];
  metrics.forEach((m, i) => {
    const col = i % 3, row = Math.floor(i / 3), cw = 2.08;
    const x = W - M - cw - col * (cw + 0.12), y = 5.45 + row * 0.78;
    card(s, x, y, cw, 0.66, { fill: C.navy });
    text(s, "—", { x: x + 0.1, y, w: 0.4, h: 0.66, fontSize: 18, bold: true, color: C.cyan, valign: "middle", align: "center", rtlMode: false });
    text(s, m, { x: x + 0.45, y, w: cw - 0.6, h: 0.66, fontSize: 12.5, valign: "middle" });
  });
  notes(s, "الخريطة بلا أرقام عمداً. المنصة تحسب هذه المؤشرات من السجلات الفعلية، وتظهر في صفحة الأثر عند الاستخدام.");
}

// 11 — TECHNOLOGY & TRUST
{
  const s = pres.addSlide({ masterName: "ATHAR_DARK" });
  bg(s, "bg-dark-b.png");
  title(s, "تقنية ذكية… وثقة مبنية على التحقّق");
  // architecture (left)
  const lx = M, lw = 6.4;
  const layers = [
    ["الواجهة", "Next.js + TypeScript · تطبيق ويب قابل للتثبيت (PWA)", "منجز", C.cyan],
    ["الخادم", "معالجة النداءات · ربط القنوات · صلاحيات تُفحص في الخادم", "منجز", C.cyan],
    ["قاعدة البيانات", "Supabase + PostgreSQL · صلاحيات على مستوى الصفوف · تحديث فوري", "منجز", C.cyan],
  ];
  layers.forEach(([h, d, st, col], i) => {
    const y = 1.75 + i * 1.12;
    card(s, lx, y, lw - 1.95, 0.95, { fill: C.navy });
    text(s, h, { x: lx + 0.2, y: y + 0.1, w: lw - 2.35, h: 0.38, fontSize: 16, bold: true });
    text(s, d, { x: lx + 0.2, y: y + 0.48, w: lw - 2.35, h: 0.4, fontSize: 12, color: C.muted });
    pill(s, st, lx + 0.15, y + 0.12, 0.85, col, { t: 85 });
  });
  card(s, lx + lw - 1.8, 1.75, 1.8, 3.19, { fill: C.purple, t: 86, line: C.purple });
  text(s, "Claude API", { x: lx + lw - 1.8, y: 1.95, w: 1.8, h: 0.4, fontSize: 15, bold: true, color: C.purple, align: "center", rtlMode: false });
  text(s, "تحليل الدارجة واستخراج المعلومات", { x: lx + lw - 1.7, y: 2.4, w: 1.6, h: 0.9, fontSize: 12, align: "center" });
  text(s, "pgvector", { x: lx + lw - 1.8, y: 3.35, w: 1.8, h: 0.35, fontSize: 14, bold: true, color: C.purple, align: "center", rtlMode: false });
  text(s, "كشف التشابه والتكرار", { x: lx + lw - 1.7, y: 3.7, w: 1.6, h: 0.5, fontSize: 12, align: "center" });
  text(s, "مدمج — يعمل عند إضافة المفاتيح", { x: lx + lw - 1.75, y: 4.3, w: 1.7, h: 0.55, fontSize: 10.5, color: C.muted, align: "center" });
  // evidence strip
  const ev = [["69", "اختبار أمان لقاعدة البيانات"], ["42", "اختبار وحدة"], ["7", "اختبارات شاملة في المتصفح"]];
  ev.forEach(([n, l], i) => {
    const cw = (lw - 0.3) / 3, x = lx + lw - (i + 1) * cw - i * 0.15;
    card(s, x, 5.2, cw, 1.3, { fill: C.navy2 });
    text(s, n, { x, y: 5.27, w: cw, h: 0.65, fontSize: 32, bold: true, color: C.cyan, align: "center", rtlMode: false });
    text(s, l, { x: x + 0.1, y: 5.9, w: cw - 0.2, h: 0.55, fontSize: 12, color: C.muted, align: "center" });
  });
  text(s, "نتائج آخر تشغيل للاختبارات الآلية في المستودع", { x: lx, y: 6.6, w: lw, h: 0.35, fontSize: 11, color: C.muted, align: "center" });
  // trust (right)
  const rx = 7.35, rw = W - M - rx;
  text(s, "الخصوصية والأمان", { x: rx, y: 1.75, w: rw, h: 0.45, fontSize: 19, bold: true, color: C.cyan });
  const trust = ["حماية بيانات المستخدمين بصلاحيات مفروضة في قاعدة البيانات", "صلاحيات حسب الدور: مشرف ولائي يرى ولايته فقط",
    "مراجعة بشرية قبل نشر أي نداء", "رقم الهاتف لا يُعرض للعموم أبداً", "لا نشر للمواقع الدقيقة للأشخاص (مستوى الولاية)", "موافقة صريحة قبل حفظ البيانات الحسّاسة كفصيلة الدم"];
  trust.forEach((t, i) => {
    const y = 2.35 + i * 0.7;
    s.addShape(pres.shapes.OVAL, { x: W - M - 0.38, y: y + 0.08, w: 0.38, h: 0.38, fill: { color: C.cyan, transparency: 82 }, line: { color: C.cyan, width: 1 } });
    text(s, "✓", { x: W - M - 0.38, y: y + 0.08, w: 0.38, h: 0.38, fontSize: 13, bold: true, color: C.cyan, align: "center", valign: "middle", rtlMode: false });
    text(s, t, { x: rx, y, w: rw - 0.55, h: 0.55, fontSize: 15, valign: "middle" });
  });
  notes(s, "التقنيات المعلَّمة «منجز» مُتحقَّق منها في المستودع. Claude وpgvector مدمجان في الكود ويعملان فعلياً عند إضافة المفاتيح؛ لم نختبرهما بمفتاح حقيقي بعد.");
}

// 12 — ROADMAP
{
  const s = pres.addSlide({ masterName: "ATHAR_DARK" });
  bg(s, "bg-dark-a.png");
  title(s, "من نموذج أولي إلى منصة وطنية قابلة للتوسّع");
  const phases = [
    ["المرحلة 1", "إطلاق النواة الأساسية", "النموذج الأولي يعمل مع اختبارات آلية", "مكتمل", C.cyan, 0],
    ["المرحلة 2", "توسيع شبكة المتطوّعين والجمعيات", "الأدوات جاهزة… نحتاج شركاء تجريبيين", "جاهز للتجربة", C.purple, 85],
    ["المرحلة 3", "شبكة التبرّع بالدم والحملات", "الوحدات مطوَّرة… تنتظر تجربة ميدانية", "جاهز للتجربة", C.purple, 85],
    ["المرحلة 4", "التعاون مع المؤسسات والهيئات المحلية", "يتطلب شراكات واتفاقيات", "مخطَّط", C.muted, 100],
    ["المرحلة 5", "التوسّع على المستوى الوطني", "بعد تقييم التجربة الميدانية", "مخطَّط", C.muted, 100],
  ];
  const ly = 3.05, pw = 2.3, gap = (W - 2 * M - 5 * pw) / 4;
  s.addShape(pres.shapes.LINE, { x: M + pw / 2, y: ly, w: W - 2 * M - pw, h: 0, line: { color: C.line, width: 3 } });
  phases.forEach(([p, h, d, st, col, t], i) => {
    const x = W - M - pw - i * (pw + gap), cx = x + pw / 2;
    s.addShape(pres.shapes.OVAL, { x: cx - 0.24, y: ly - 0.24, w: 0.48, h: 0.48, fill: { color: col === C.muted ? C.bg : col, transparency: t === 0 ? 0 : 60 }, line: { color: col, width: 2.5 } });
    text(s, p, { x, y: 2.05, w: pw, h: 0.4, fontSize: 14, bold: true, color: col, align: "center" });
    card(s, x, 3.6, pw, 2.5, { fill: C.navy, line: i === 0 ? C.cyan : C.line });
    text(s, h, { x: x + 0.15, y: 3.75, w: pw - 0.3, h: 0.95, fontSize: 17, bold: true, align: "center", valign: "middle" });
    text(s, d, { x: x + 0.15, y: 4.72, w: pw - 0.3, h: 0.8, fontSize: 13, color: C.muted, align: "center" });
    pill(s, st, x + 0.35, 5.62, pw - 0.7, col, { t: col === C.muted ? 90 : 85 });
  });
  text(s, "لا نلتزم بتواريخ قبل اعتماد خطة تجريبية مع الشركاء.", { x: M, y: 6.45, w: W - 2 * M, h: 0.4, fontSize: 14, color: C.muted, align: "center" });
  notes(s, "الصدق هنا قوة: المرحلة الأولى مكتملة تقنياً، والباقي يحتاج شركاء ميدانيين وليس مزيداً من الكود فقط.");
}

// 13 — VISION & ASK
{
  const s = pres.addSlide({ masterName: "ATHAR_DARK" });
  bg(s, "bg-dark-b.png");
  title(s, "نريد أن يصبح الوصول إلى المساعدة أسهل… في كل ولاية جزائرية", "ما نحتاجه للخطوة التالية: تجربة ميدانية مسؤولة وقابلة للقياس");
  const asks = [
    ["شركاء تجريبيون من الجمعيات", "جمعيات تستعمل المنصة فعلياً وتعطينا ملاحظاتها", C.cyan],
    ["دعم المؤسسات المحلية", "مديرية ولائية تتولّى الإشراف في التجربة", C.purple],
    ["الوصول إلى البيانات الرسمية", "قوائم البلديات ودور الشباب ومراكز حقن الدم", C.cyan],
    ["متطوّعون لتجربة المنصة", "مجموعة أولى تختبر وتقترح وتحسّن", C.purple],
    ["مرافقة تقنية ومؤسساتية", "استضافة، ومراجعة أمنية وقانونية (القانون 18-07)", C.cyan],
    ["تجربة ميدانية محدودة", "ولاية واحدة، مدّة محدّدة، ومؤشّرات تقييم واضحة", C.purple],
  ];
  const cw = 3.85, ch = 2.0, gx = 0.29, gy = 0.3, y0 = 2.15;
  asks.forEach(([h, d, col], i) => {
    const c = i % 3, r = Math.floor(i / 3), x = W - M - cw - c * (cw + gx), y = y0 + r * (ch + gy);
    card(s, x, y, cw, ch, { fill: C.navy, line: col, lw: 1.2 });
    s.addShape(pres.shapes.OVAL, { x: x + cw - 0.75, y: y + 0.28, w: 0.45, h: 0.45, fill: { color: col, transparency: 78 }, line: { color: col, width: 1.5 } });
    text(s, h, { x: x + 0.25, y: y + 0.85, w: cw - 0.5, h: 0.45, fontSize: 18, bold: true });
    text(s, d, { x: x + 0.25, y: y + 1.32, w: cw - 0.5, h: 0.6, fontSize: 14, color: C.muted });
  });
  notes(s, "اطلب شيئاً محدداً وقابلاً للتنفيذ: شريك، مديرية، بيانات، متطوعون، مرافقة، تجربة واحدة.");
}

// 14 — CLOSE
(async () => {
  const s = pres.addSlide({ masterName: "ATHAR_DARK" });
  bg(s, "bg-close.png");
  text(s, [{ text: "قد تكون مساعدتك رسالة…", options: { breakLine: true } }, { text: "وقد تكون ", options: {} }, { text: "حياةً تتغيّر", options: { color: C.cyan } }, { text: ".", options: {} }],
    { x: 4.2, y: 1.1, w: W - M - 4.2, h: 2.4, fontSize: 46, bold: true, lineSpacingMultiple: 1.2, valign: "middle" });
  s.addImage({ altText: "شعار إيثار", path: A("gen/logo.png"), x: W - M - 0.8, y: 3.85, w: 0.8, h: 0.8 });
  text(s, [{ text: "إيثار", options: { bold: true, color: C.white } }, { text: " — لأن الخير عندما يتنظّم، يصل أبعد.", options: { color: C.muted } }],
    { x: 4.2, y: 3.92, w: W - M - 4.2 - 1.0, h: 0.65, fontSize: 24, valign: "middle" });
  text(s, "لا نريد فقط أن نرى الخير في مجتمعنا… نريد أن نمنحه الطريق ليصل.", { x: 2.6, y: 5.75, w: W - M - 2.6, h: 0.6, fontSize: 22, bold: true, color: C.purple, valign: "middle" });
  const qr = await QRCode.toDataURL(REPO_URL, { margin: 2, width: 600, color: { dark: "#090E1A", light: "#F5F7FA" } });
  s.addImage({ altText: "رمز QR لمستودع المشروع", data: qr, x: M, y: 4.65, w: 1.45, h: 1.45 });
  text(s, "مستودع المشروع", { x: M, y: 6.15, w: 1.45, h: 0.3, fontSize: 11, color: C.muted, align: "center" });
  notes(s, "اختم بالجملة الأخيرة ببطء، ثم توقّف. لا تقل «شكراً» قبل أن تترك الجملة تستقر.");

  await pres.writeFile({ fileName: OUTFILE });
  console.log("written", OUTFILE);
})();
