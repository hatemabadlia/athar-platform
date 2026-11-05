// Builds presentation/ATHAR_SERVICES_AR.pptx — the complete services catalogue of Athar (إيثار).
// 15 slides, 16:9, Arabic RTL, editable, native PowerPoint animations (via animate.js).
// Every service listed here exists in the codebase; its status comes from docs/MORNING_REPORT.md.
const pptxgen = require("pptxgenjs");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const QRCode = require("qrcode");
const ROOT = path.resolve(__dirname, "../..");
const React = require(path.join(ROOT, "node_modules/react"));
const { renderToStaticMarkup } = require(path.join(ROOT, "node_modules/react-dom/server"));
const Lucide = require(path.join(ROOT, "node_modules/lucide-react"));

const A = (p) => path.resolve(__dirname, "../ASSETS", p);
const OUTFILE = path.resolve(__dirname, "../ATHAR_SERVICES_AR.pptx");
const REPO_URL = "https://github.com/hatemabadlia/athar-platform";

const C = { bg: "090E1A", navy: "101B2D", navy2: "16243A", cyan: "00D4FF", purple: "DA70D6", white: "F5F7FA", muted: "AAB6C5", line: "24344F" };
const FONT = "Tajawal";
const W = 13.333, H = 7.5, M = 0.6;

// ---------------------------------------------------------------- service catalogue (single source of truth)
// st: "ok" = implemented and tested locally · "part" = partly working / waiting for credentials or device test
const DOMAINS = [
  { key: "intake", name: "الاستقبال والوصول", icon: "Megaphone", color: C.cyan },
  { key: "ai", name: "التحليل الذكي والتحقّق", icon: "Sparkles", color: C.purple },
  { key: "mod", name: "الإشراف والحوكمة", icon: "ShieldCheck", color: C.cyan },
  { key: "vol", name: "رحلة المتطوّع", icon: "HandHeart", color: C.purple },
  { key: "rec", name: "الاعتراف والتوثيق", icon: "Award", color: C.cyan },
  { key: "hum", name: "العمل الإنساني والبيئي", icon: "HeartHandshake", color: C.purple },
  { key: "crisis", name: "الطوارئ والأزمات", icon: "Siren", color: C.cyan },
  { key: "impact", name: "الأثر والبيانات", icon: "BarChart3", color: C.purple },
  { key: "platform", name: "الخصوصية والمنصة", icon: "Lock", color: C.cyan },
];
const S = [
  // intake
  { d: "intake", name: "الخريطة الحية للنداءات", route: "/", icon: "Map", st: "ok",
    desc: "نداءات معتمدة فقط، بموقع تقريبي على مستوى الولاية ودون أرقام هواتف، مع سبب اقتراح كل نداء وتحديث فوري." },
  { d: "intake", name: "إرسال نداء", route: "/submit", icon: "Send", st: "ok",
    desc: "استمارة عامة بالدارجة أو العربية أو الفرنسية، بموافقة صريحة وحدّ للإرسال، وتُحفظ المسودة دون اتصال." },
  { d: "intake", name: "الاستقبال متعدد القنوات", route: "webhooks", icon: "Inbox", st: "part", note: "القنوات: بانتظار الحسابات",
    desc: "الاستمارة ولصق المشرف يعملان. بوت تيليغرام وواتساب للأعمال مبنيّان مع فحص التوقيع. لا جمع آلي من الشبكات الاجتماعية." },
  { d: "intake", name: "المساعد الذكي", route: "/api/chat", icon: "Bot", st: "part", note: "Claude: بانتظار المفتاح",
    desc: "يعمل حالياً بوضع القواعد. يجيب بالعربية والفرنسية من قاعدة البيانات: نداءات حسب الولاية والفئة، توافق الفصيلة، نقاطي ونواديّ." },
  // ai
  { d: "ai", name: "المعالجة الذكية بسبع مراحل", route: "/ingest", icon: "Sparkles", st: "part", note: "Claude: بانتظار المفتاح",
    points: ["يعمل حالياً بوضع القواعد، ومسار Claude مدمج", "تطبيع الدارجة إلى العربية الفصحى", "استخراج الولاية والفئة والفصيلة والهاتف والموعد", "تحديد الاستعجال ودرجة الثقة", "كل حقل غير موجود في النص الأصلي يُحذف آلياً"] },
  { d: "ai", name: "كشف التكرار ودرجة المصداقية", route: "SQL", icon: "ScanSearch", st: "ok",
    points: ["مقارنة بالأرشيف: تشابه النص، بصمة المحتوى، بصمة مشفّرة للهاتف، التواريخ القديمة", "ربط آلي فقط عند تشابه عالٍ جداً في الولاية والفئة نفسيهما", "درجة مصداقية من 100 مع أسبابها: أداة فرز لا حكم", "كل قرار يُسجَّل في سجلّ الذكاء الاصطناعي"] },
  // moderation
  { d: "mod", name: "طابور الإشراف", route: "/admin", icon: "ShieldCheck", st: "ok",
    desc: "اعتماد أو تصحيح أو رفض أو دمج أو إغلاق كل نداء، كشف الرقم بسجلّ تدقيق، تأكيد المشاركات، وإخطار المتبرّعين المتوافقين." },
  { d: "mod", name: "طابور الاستقبال المباشر", route: "/ingest", icon: "Radar", st: "ok",
    desc: "كل ما يصل من كل القنوات لحظة وصوله مع نتيجة التحليل، ومحصور في ولاية المشرف." },
  { d: "mod", name: "الأدوار والنطاقات الولائية", route: "/admin", icon: "UserCog", st: "ok",
    desc: "ستة أدوار، والصلاحيات مفروضة داخل قاعدة البيانات: المشرف يرى ولايته فقط، والوزارة وحدها تعيّن مديري الولايات." },
  { d: "mod", name: "السجلّات والاستيراد", route: "/admin", icon: "ScrollText", st: "ok",
    desc: "سجلّ تدقيق لكل قرار حسّاس، سجلّ قرارات الذكاء الاصطناعي، حالة الربط بالخدمات، واستيراد قوائم المؤسسات بملف CSV." },
  // volunteer
  { d: "vol", name: "الملف والمطابقة الذكية", route: "/profile", icon: "UserCircle2", st: "ok",
    desc: "الولاية والمهارات والتوفّر وفصيلة الدم بموافقة، واقتراح النداءات المناسبة مع سبب كل اقتراح." },
  { d: "vol", name: "الانضمام إلى النداءات", route: "/", icon: "HandHeart", st: "ok",
    desc: "ينضمّ المتطوّع بنقرة، ويرى المشرف من انضمّ، ولا تُحتسب المشاركة إلا بعد تأكيدها." },
  { d: "vol", name: "النوادي والأنشطة", route: "/clubs", icon: "Building2", st: "ok",
    desc: "نوادٍ تطوعية في الجامعات ودور الشباب، بأعضاء وأنشطة مجدولة وإحصاءات لكل نادٍ." },
  { d: "vol", name: "الإشعارات", route: "/notifications", icon: "Bell", st: "ok",
    desc: "تنبيه داخل المنصة عند نداء دم متوافق مع فصيلتك أو تطابق في التبرّعات العينية، مع رابط مباشر." },
  // recognition
  { d: "rec", name: "الحضور برمز QR", route: "/profile · /clubs", icon: "QrCode", st: "ok",
    desc: "رمز موقّع صالح 5 دقائق ولمرة واحدة، يمسحه مسؤول النشاط بالكاميرا أو يلصقه. لا يمكن تأكيد الحضور ذاتياً." },
  { d: "rec", name: "النقاط والشارات", route: "/profile", icon: "Award", st: "ok",
    desc: "نقاط من الأفعال المؤكَّدة فقط، و8 شارات: الخطوة الأولى، بطل الدم، مستجيب سريع، ملتزم، صديق البيئة، عضو نادٍ فاعل، غارس، حارس الغابة." },
  { d: "rec", name: "الشهادات والتحقّق العلني", route: "/verify/[id]", icon: "FileCheck2", st: "ok",
    desc: "شهادة بالساعات المؤكَّدة فقط، موقّعة رقمياً، يتحقّق منها أي شخص عبر رابطها، وتُحفظ PDF من المتصفح." },
  // humanitarian
  { d: "hum", name: "شبكة المتبرّعين بالدم", route: "/donors", icon: "Droplets", st: "ok",
    points: ["تسجيل بموافقة صريحة على استعمال الفصيلة والولاية", "جدول توافق الكريات الحمراء ABO/Rh", "إخطار المتوافقين دون كشف هوية أي طرف، مع حدّ لعدد الإخطارات", "سجلّ تبرّعاتي — والأهلية الطبية يقرّرها مركز حقن الدم"] },
  { d: "hum", name: "التبرّعات العينية", route: "/donations", icon: "Gift", st: "ok",
    points: ["عروض واحتياجات في 8 فئات: ملابس وأغطية، غذاء، أدوات مدرسية، مستلزمات طبية، أثاث، نقل، خدمات…", "مطابقة كل عرض بالحاجة المناسبة", "رقم الاتصال لا يُكشف إلا بعد القبول", "متابعة التسليم حتى الإتمام"] },
  { d: "hum", name: "دليل الجمعيات المعتمدة", route: "/associations", icon: "BadgeCheck", st: "ok",
    desc: "طلب اعتماد برقم الاعتماد والوثائق، تتحقّق منه المديرية الولائية فتمنح شارة «معتمدة» ودور الجمعية." },
  { d: "hum", name: "الحملات التضامنية", route: "/campaigns", icon: "CalendarHeart", st: "ok",
    desc: "رمضان، الدخول المدرسي، الشتاء، البيئة، الدم…: هدف وتقدّم ومناوبات للمتطوّعين، ومنع تكرار المستفيد بين الجمعيات دون كشف بياناته." },
  { d: "hum", name: "غابة إيثار", route: "/trees", icon: "TreePine", st: "ok",
    desc: "توثيق الأشجار المغروسة بالصور في تخزين خاص مع حذف بيانات EXIF، وإشارات الموقع والتاريخ للمشرف قبل الاعتماد." },
  // crisis
  { d: "crisis", name: "وضع الأزمات والملاجئ والتنبيهات", route: "/crisis/[id]", icon: "Siren", st: "part", note: "SMS: بانتظار مزوّد" },
  // impact
  { d: "impact", name: "تقارير ما بعد النشاط", route: "/admin", icon: "ClipboardList", st: "ok",
    desc: "النتيجة والموارد والحضور والساعات، مع أدلّة في تخزين خاص، يراجعها المشرف قبل احتسابها." },
  { d: "impact", name: "شفافية الأثر", route: "/impact", icon: "BarChart3", st: "ok",
    desc: "أرقام وطنية وولائية محسوبة من السجلات مباشرة، مع فلترة حسب الفترة، وتصدير CSV ونسخة للطباعة PDF." },
  { d: "impact", name: "التوقّعات الموسمية", route: "/admin", icon: "TrendingUp", st: "ok",
    desc: "توقّع الاحتياجات حسب الفئة والشهر من تاريخ المنصة نفسه، ويقول بوضوح «لا توجد بيانات كافية» قبل 13 شهراً من النشاط." },
  // platform
  { d: "platform", name: "مركز الخصوصية", route: "/privacy", icon: "Lock", st: "ok",
    desc: "سجلّ الموافقات، تنزيل بياناتي (JSON)، حذف الحساب مع مهلة 14 يوماً، ومهام دورية لحذف البيانات القديمة." },
  { d: "platform", name: "تطبيق ويب يعمل دون اتصال", route: "PWA", icon: "WifiOff", st: "part", note: "لم يُختبر على هاتف بعد",
    desc: "قابل للتثبيت على الهاتف، صندوق صادر يحفظ النداء حتى عودة الشبكة، ولا يخزّن الصفحات الخاصة." },
  { d: "platform", name: "الدخول واللغات", route: "/login", icon: "Languages", st: "part", note: "الهاتف والفرنسية: جزئي",
    desc: "دخول برمز يصل إلى البريد (الدخول بالهاتف ينتظر مزوّد SMS)، عربية كاملة من اليمين إلى اليسار، وفرنسية للواجهة العامة الأساسية." },
];
S.forEach((s, i) => { s.n = i + 1; });
const byDomain = (k) => S.filter((s) => s.d === k);
const N_OK = S.filter((s) => s.st === "ok").length, N_PART = S.length - N_OK;
const DOMAIN_SLIDE = {}; // filled while building

// ---------------------------------------------------------------- assets: icons + screenshot crops
function iconPng(name, color, size = 256) {
  const out = A(`gen/icons/${name}-${color}.png`);
  if (!fs.existsSync(out)) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const svg = renderToStaticMarkup(React.createElement(Lucide[name], { size: 96, color: `#${color}`, strokeWidth: 1.8 }));
    fs.writeFileSync(out + ".svg", svg);
  }
  return out;
}
async function rasterIcons() {
  for (const f of fs.readdirSync(A("gen/icons")).filter((f) => f.endsWith(".svg"))) {
    const png = A(`gen/icons/${f.replace(/\.svg$/, "")}`);
    await sharp(Buffer.from(fs.readFileSync(A(`gen/icons/${f}`), "utf8").replace(/width="96" height="96"/, 'width="256" height="256"')), { density: 300 })
      .resize(256, 256).png().toFile(png);
    fs.unlinkSync(A(`gen/icons/${f}`));
  }
}
const CROPS = {
  "svc-submit.png": ["screens/submit.png", { left: 799, top: 173, width: 1282, height: 1476 }],
  "svc-donors.png": ["screens/donors.png", { left: 576, top: 194, width: 1728, height: 1361 }],
  "svc-impact.png": ["screens/impact.png", { left: 209, top: 158, width: 2462, height: 1282 }],
  "svc-profile.png": ["screens/profile.png", { left: 209, top: 173, width: 2462, height: 1253 }],
  "svc-badges.png": ["screens/profile.png", { left: 209, top: 1310, width: 677, height: 490 }],
  "svc-privacy.png": ["screens/profile.png", { left: 936, top: 1087, width: 1735, height: 317 }],
};
async function crops() {
  for (const [out, [src, box]] of Object.entries(CROPS)) await sharp(A(src)).extract(box).png().toFile(A(`gen/${out}`));
}

// ---------------------------------------------------------------- deck + helpers
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.rtlMode = true;
pres.title = "إيثار — دليل الخدمات";
pres.author = "فريق إيثار";
pres.subject = "كل خدمات منصة إيثار";
pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
pres.defineSlideMaster({
  title: "ATHAR_DARK", background: { color: C.bg }, objects: [],
  slideNumber: { x: 0.35, y: 7.02, w: 0.6, h: 0.3, fontFace: FONT, fontSize: 10, color: C.muted, align: "left" },
});

// animation tagging (see animate.js)
let ANIM = null, animSeq = 0;
const anim = (step, effect = "fade", trigger = "after", dur = 500) => { ANIM = { step, effect, trigger, dur }; };
const noAnim = () => { ANIM = null; };
{
  const addSlide = pres.addSlide.bind(pres);
  pres.addSlide = (o) => {
    ANIM = null;
    const s = addSlide(o);
    for (const m of ["addText", "addShape", "addImage"]) {
      const f = s[m].bind(s);
      s[m] = (a, b) => {
        const opts = m === "addImage" ? a : b;
        if (ANIM && opts && !opts.objectName) opts.objectName = `anim:${ANIM.step}:${ANIM.effect}:${ANIM.trigger}:${ANIM.dur}:${++animSeq}`;
        return f(a, b);
      };
    }
    return s;
  };
}

const ar = (o = {}) => ({ fontFace: FONT, rtlMode: true, lang: "ar-DZ", align: "right", valign: "top", margin: 0, isTextBox: true, color: C.white, ...o });
function text(slide, t, o) {
  const base = ar(o);
  const runs = Array.isArray(t) ? t.map((r) => ({ text: r.text, options: { rtlMode: base.rtlMode, lang: base.lang, fontFace: FONT, ...r.options } })) : t;
  slide.addText(runs, base);
}
const latin = (slide, t, o) => text(slide, t, { rtlMode: false, lang: "en-US", ...o });
function bg(slide, file) { slide.addImage({ path: A(`gen/${file}`), x: 0, y: 0, w: W, h: H, altText: "خلفية زخرفية" }); }
function card(slide, x, y, w, h, o = {}) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: o.r ?? 0.12, fill: { color: o.fill ?? C.navy, transparency: o.t ?? 0 }, line: { color: o.line ?? C.line, width: o.lw ?? 1 } });
}
function pill(slide, t, x, y, w, color, o = {}) {
  const h = o.h ?? 0.32;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: h / 2, fill: { color, transparency: o.t ?? 84 }, line: { color, width: 1 } });
  text(slide, t, { x, y, w, h, fontSize: o.fontSize ?? 10.5, bold: true, color, align: "center", valign: "middle" });
}
function iconBadge(slide, name, x, y, d, color) {
  slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color, transparency: 84 }, line: { color, width: 1.25 } });
  const p = d * 0.22;
  slide.addImage({ path: iconPng(name, color), x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p, altText: "أيقونة" });
}
function framedImage(slide, file, x, y, w, h, alt = "لقطة شاشة حقيقية من النموذج الأولي لإيثار") {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x - 0.06, y: y - 0.06, w: w + 0.12, h: h + 0.12, rectRadius: 0.1, fill: { color: C.navy2 }, line: { color: C.line, width: 1 },
    shadow: { type: "outer", color: "000000", opacity: 0.45, blur: 14, offset: 4, angle: 90 } });
  slide.addImage({ path: A(file), x, y, w, h, altText: alt });
}
const caption = (slide, t, x, y, w) => text(slide, t, { x, y, w, h: 0.3, fontSize: 10.5, color: C.muted, align: "center" });
const stColor = (s) => (s.st === "ok" ? C.cyan : C.purple);
const stLabel = (s) => (s.st === "ok" ? "يعمل · مختبَر محلياً" : s.note);

// Domain slide header: kicker pill "المجال n من 9" + title + subtitle
function header(slide, dKey, title, sub) {
  const di = DOMAINS.findIndex((d) => d.key === dKey), d = DOMAINS[di];
  DOMAIN_SLIDE[dKey] = slide._slideNum ?? null;
  iconBadge(slide, d.icon, W - M - 0.62, 0.5, 0.62, d.color);
  text(slide, title, { x: M + 2.2, y: 0.42, w: W - 2 * M - 3.05, h: 0.78, fontSize: 30, bold: true, valign: "middle" });
  if (sub) text(slide, sub, { x: M, y: 1.2, w: W - 2 * M - 0.85, h: 0.4, fontSize: 15, color: C.muted });
  const k = byDomain(dKey).length, cnt = k === 1 ? "خدمة واحدة" : k === 2 ? "خدمتان" : `${k} خدمات`;
  pill(slide, `المجال ${di + 1} من ${DOMAINS.length} · ${cnt}`, M, 0.64, 2.05, d.color, { h: 0.34, fontSize: 11 });
}

// One service card. Layout (RTL): icon circle + route at the right, name + status on line 1, description / bullets below.
function serviceCard(slide, s, x, y, w, h, o = {}) {
  const col = stColor(s);
  card(slide, x, y, w, h, { fill: C.navy, line: o.highlight ? col : C.line });
  iconBadge(slide, s.icon, x + w - 0.72, y + 0.14, 0.56, DOMAINS.find((d) => d.key === s.d).color);
  latin(slide, s.route, { x: x + w - 0.95, y: y + 0.74, w: 0.98, h: 0.22, fontSize: 8.5, color: C.muted, align: "center" });
  const pw = Math.min(2.4, 0.4 + stLabel(s).length * 0.062);
  pill(slide, stLabel(s), x + 0.2, y + 0.16, pw, col, { h: 0.3, fontSize: 10 });
  text(slide, [{ text: `${s.n}. `, options: { color: C.muted } }, { text: s.name, options: {} }], { x: x + 0.3 + pw, y: y + 0.12, w: w - 1.15 - pw, h: 0.38, fontSize: 15.5, bold: true, valign: "middle" });
  const bodyW = w - 1.2;
  if (s.points) {
    text(slide, s.points.map((p, i) => ({ text: p, options: { bullet: { indent: 14 }, breakLine: i < s.points.length - 1, paraSpaceAfter: 3 } })),
      { x: x + 0.2, y: y + 0.6, w: bodyW, h: h - 0.68, fontSize: o.big ? 13.5 : 13, color: C.white, lineSpacingMultiple: 1.05 });
  } else {
    text(slide, s.desc, { x: x + 0.2, y: y + 0.58, w: bodyW, h: h - 0.62, fontSize: o.big ? 14 : 12.5, color: C.muted, lineSpacingMultiple: o.big ? 1.12 : 1.05 });
  }
}
function serviceColumn(slide, list, x, y0, w, y1, firstStep = 2) {
  const gap = 0.14, h = (y1 - y0 - gap * (list.length - 1)) / list.length;
  list.forEach((s, i) => {
    anim(firstStep + i, "rise", "after", 400);
    serviceCard(slide, s, x, y0 + i * (h + gap), w, h, { big: list.length <= 3 });
  });
  noAnim();
}
const notes = (slide, s) => slide.addNotes(s);
let slideNo = 0;
const newSlide = (bgFile) => { const s = pres.addSlide({ masterName: "ATHAR_DARK" }); s._slideNum = ++slideNo; bg(s, bgFile); return s; };

// ---------------------------------------------------------------- build
(async () => {
  await crops();
  // pre-register icons so they can be rasterised before the deck references them
  for (const d of DOMAINS) for (const c of [C.cyan, C.purple]) iconPng(d.icon, c);
  for (const s of S) for (const c of [C.cyan, C.purple]) iconPng(s.icon, c);
  for (const n of ["Eye", "UserCircle2", "Building2", "BadgeCheck", "ShieldCheck", "Landmark", "Globe", "KeyRound", "Smartphone", "Database", "CheckCircle2", "Clock", "MessagesSquare", "Home", "Users"]) for (const c of [C.cyan, C.purple]) iconPng(n, c);
  await rasterIcons();

  // 01 — COVER --------------------------------------------------------------
  {
    const s = newSlide("bg-close.png");
    anim(1, "zoom", "after", 700);
    s.addImage({ altText: "شعار إيثار", path: A("gen/logo.png"), x: W - M - 1.0, y: 1.0, w: 1.0, h: 1.0 });
    anim(2, "fade", "after", 900);
    text(s, "دليل خدمات إيثار", { x: 3.6, y: 2.2, w: W - M - 3.6, h: 1.0, fontSize: 50, bold: true, valign: "middle" });
    text(s, [{ text: `${S.length} خدمة`, options: { color: C.cyan } }, { text: " في ", options: {} }, { text: `${DOMAINS.length} مجالات`, options: { color: C.purple } },
      { text: " — من النداء… إلى الأثر.", options: {} }], { x: 3.6, y: 3.25, w: W - M - 3.6, h: 0.7, fontSize: 28, bold: true, valign: "middle" });
    anim(3, "fade", "after", 600);
    text(s, "منصة تنسيق إنساني ذكية، مصمّمة للجزائر: تربط المحتاج بالمتطوّع والمتبرّع والجمعية والمؤسسة.", { x: 3.6, y: 4.1, w: W - M - 3.6, h: 0.5, fontSize: 17, color: C.muted });
    anim(4, "rise", "after", 500);
    pill(s, "الحالة: نموذج أولي مطوَّر ومختبَر محلياً — لم يُطلق للعموم بعد", W - M - 5.6, 5.0, 5.6, C.purple, { h: 0.4, fontSize: 12.5 });
    notes(s, "هذا العرض دليل كامل لكل خدمات إيثار. كل خدمة مذكورة موجودة فعلاً في الكود، وحالتها مكتوبة عليها بصدق.");
  }

  // 02 — OVERVIEW: 9 domains ------------------------------------------------
  {
    const s = newSlide("bg-dark-a.png");
    text(s, "تسعة مجالات… تغطّي رحلة الخير كاملة", { x: M, y: 0.42, w: W - 2 * M, h: 0.78, fontSize: 30, bold: true, valign: "middle" });
    text(s, "كل مجال في شريحة مستقلة، وكل خدمة مرقّمة من 1 إلى " + S.length, { x: M, y: 1.2, w: W - 2 * M, h: 0.4, fontSize: 15, color: C.muted });
    const cw = 3.92, ch = 1.6, gx = 0.17, gy = 0.12, y0 = 1.8;
    const slideOf = { intake: 4, ai: 5, mod: 6, vol: 7, rec: 8, hum: 9, crisis: 11, impact: 12, platform: 13 };
    DOMAINS.forEach((d, i) => {
      const c = i % 3, r = Math.floor(i / 3), x = W - M - cw - c * (cw + gx), y = y0 + r * (ch + gy);
      const list = byDomain(d.key);
      anim(1 + i, "zoom", "after", 280);
      card(s, x, y, cw, ch, { fill: C.navy, line: d.color, lw: 1 });
      iconBadge(s, d.icon, x + cw - 0.82, y + 0.2, 0.62, d.color);
      text(s, [{ text: `${i + 1}. `, options: { color: d.color } }, { text: d.name, options: {} }], { x: x + 0.2, y: y + 0.2, w: cw - 1.15, h: 0.45, fontSize: 17, bold: true, valign: "middle" });
      text(s, list.map((x) => x.name).join(" · "), { x: x + 0.2, y: y + 0.86, w: cw - 0.4, h: 0.45, fontSize: 10.5, color: C.muted, lineSpacingMultiple: 1.05 });
      latin(s, `${list[0].n}–${list[list.length - 1].n}`.replace(/^(\d+)–\1$/, "$1"), { x: x + 0.2, y: y + ch - 0.32, w: 0.9, h: 0.25, fontSize: 9.5, color: d.color, align: "left" });
      text(s, `الشريحة ${slideOf[d.key]}`, { x: x + cw - 1.4, y: y + ch - 0.32, w: 1.2, h: 0.25, fontSize: 9.5, color: C.muted });
    });
    anim(20, "fade", "after", 500);
    text(s, [{ text: "● ", options: { color: C.cyan } }, { text: `${N_OK} خدمة تعمل ومختبَرة محلياً`, options: {} }, { text: "     ● ", options: { color: C.purple } },
      { text: `${N_PART} خدمات جزئية أو بانتظار مفاتيح ومزوّدين`, options: {} }], { x: M, y: 7.0, w: W - 2 * M, h: 0.32, fontSize: 12, color: C.muted, align: "center" });
    notes(s, "خريطة العرض: تسعة مجالات. الأرقام أسفل الشريحة محسوبة من قائمة الخدمات نفسها، وتفصيلها في الشريحة 14.");
  }

  // 03 — WHO USES ATHAR ------------------------------------------------------
  {
    const s = newSlide("bg-dark-b.png");
    text(s, "من يستعمل إيثار… وماذا يستطيع؟", { x: M, y: 0.42, w: W - 2 * M, h: 0.78, fontSize: 30, bold: true, valign: "middle" });
    text(s, "زائر بلا حساب، وستة أدوار صلاحياتُها مفروضة داخل قاعدة البيانات نفسها", { x: M, y: 1.2, w: W - 2 * M, h: 0.4, fontSize: 15, color: C.muted });
    const roles = [
      ["الزائر", "بلا حساب", "Eye", ["يتصفّح الخريطة والنداءات المعتمدة", "يرسل نداءً ويستعمل المساعد", "يرى صفحة الأثر ويتحقّق من شهادة"]],
      ["المتطوّع", "حسابه فقط", "UserCircle2", ["ملف ومطابقة ذكية وانضمام", "QR ونقاط وشارات وشهادات", "تبرّع بالدم وعيني، وأشجار"]],
      ["قائد النادي", "ناديه", "Building2", ["يدير أعضاء النادي وأنشطته", "يؤكّد الحضور بمسح رمز QR", "يرى إحصاءات ناديه"]],
      ["الجمعية", "جمعيتها", "BadgeCheck", ["شارة «معتمدة» بعد التحقّق", "تنشئ الحملات والمناوبات", "تسجّل المستفيدين دون تكرار"]],
      ["المشرف", "ولايته", "ShieldCheck", ["يراجع النداءات ويعتمدها", "يتابع طابور الاستقبال", "يراجع التقارير والأشجار"]],
      ["مدير ولائي (DJSL)", "ولايته", "Landmark", ["كل صلاحيات المشرف", "يعتمد الجمعيات ويعيّن المشرفين", "يعلن الطوارئ ويدير الملاجئ"]],
      ["الوزارة", "وطني", "Globe", ["كل الولايات", "تعيّن مديري الولايات", "سجلّ الذكاء الاصطناعي والتدقيق"]],
    ];
    const cw = 2.92, ch = 2.45, gx = 0.17, y0 = 1.85;
    roles.forEach(([name, scope, icon, caps], i) => {
      const r = i < 4 ? 0 : 1, c = r ? i - 4 : i, n = r ? 3 : 4;
      const rowW = n * cw + (n - 1) * gx, x0 = W - M - (W - 2 * M - rowW) / 2 - cw;
      const x = x0 - c * (cw + gx), y = y0 + r * (ch + 0.17), col = i % 2 ? C.purple : C.cyan;
      anim(1 + i, "rise", "after", 330);
      card(s, x, y, cw, ch, { fill: C.navy, line: col });
      iconBadge(s, icon, x + cw - 0.75, y + 0.18, 0.56, col);
      text(s, name, { x: x + 0.18, y: y + 0.2, w: cw - 1.0, h: 0.38, fontSize: 16, bold: true, valign: "middle" });
      pill(s, scope, x + cw - 1.0 - 1.2 + 0.0, y + 0.62, 1.2, col, { h: 0.28, fontSize: 10 });
      text(s, caps.map((t, k) => ({ text: t, options: { bullet: { indent: 12 }, breakLine: k < caps.length - 1, paraSpaceAfter: 4 } })),
        { x: x + 0.18, y: y + 1.05, w: cw - 0.36, h: ch - 1.15, fontSize: 12.5, color: C.white });
    });
    notes(s, "الصلاحيات ليست في الواجهة فقط: هي مفروضة بقواعد أمان على مستوى الصفوف، ومغطّاة باختبارات قاعدة البيانات.");
  }

  // 04 — D1 INTAKE ------------------------------------------------------------
  {
    const s = newSlide("bg-dark-a.png");
    header(s, "intake", "استقبال النداءات والوصول إليها", "كل الطرق التي يصل بها النداء إلى إيثار، وكل الطرق التي يصل بها الناس إلى النداء");
    anim(1, "fade", "after", 600);
    framedImage(s, "gen/alerts-list-top.png", 0.72, 1.95, 2.2, 2.95);
    framedImage(s, "gen/svc-submit.png", 3.15, 1.95, 3.0, 3.45);
    caption(s, "قائمة النداءات المعتمدة · استمارة «أرسل نداءً» (لقطات حقيقية ببيانات تجريبية)", 0.6, 5.55, 5.7);
    serviceColumn(s, byDomain("intake"), 6.55, 1.8, W - M - 6.55, 6.85);
    notes(s, "الخريطة نفسها موجودة في المنصة، لكن خوادم الخرائط لم تكن متاحة في بيئة التصوير. قنوات تيليغرام وواتساب مبنية وتنتظر الحسابات الرسمية.");
  }

  // 05 — D2 AI ------------------------------------------------------------------
  {
    const s = newSlide("bg-dark-b.png");
    header(s, "ai", "التحليل الذكي والتحقّق", "كل نداء يمرّ بسبع مراحل قبل أن يصل إلى المشرف، وكل نتيجة تحمل أسبابها");
    const stages = ["الاستقبال", "تطبيع الدارجة", "استخراج المعلومات", "التصنيف والاستعجال", "كشف المعاد تدويره", "كشف التكرار", "درجة المصداقية"];
    const sw = (W - 2 * M - 6 * 0.12) / 7;
    stages.forEach((t, i) => {
      const x = W - M - sw - i * (sw + 0.12), col = i % 2 ? C.purple : C.cyan;
      anim(1 + i, "wipe", "after", 220);
      card(s, x, 1.78, sw, 0.62, { fill: col, t: 86, line: col });
      text(s, [{ text: `${i + 1} `, options: { color: col } }, { text: t, options: {} }], { x: x + 0.05, y: 1.78, w: sw - 0.1, h: 0.62, fontSize: 12.5, bold: true, align: "center", valign: "middle" });
    });
    anim(10, "fade", "after", 500);
    framedImage(s, "gen/pipeline-steps.png", 0.72, 2.72, 5.45, 3.43);
    caption(s, "لقطة حقيقية: المراحل السبع على رسالة بالدارجة (وضع القواعد)", 0.6, 6.3, 5.7);
    serviceColumn(s, byDomain("ai"), 6.55, 2.6, W - M - 6.55, 6.85, 11);
    notes(s, "مسار Claude مكتوب ومدمج لكنه لم يُختبر بمفتاح حقيقي. وضع القواعد يعمل ومختبَر، والنتائج تحمل دائماً علامة مصدرها.");
  }

  // 06 — D3 MODERATION ------------------------------------------------------------
  {
    const s = newSlide("bg-dark-a.png");
    header(s, "mod", "الإشراف والحوكمة", "لا شيء يُنشر قبل قرار بشري، وكل قرار حسّاس مسجَّل");
    anim(1, "fade", "after", 600);
    framedImage(s, "gen/moderation-modal.png", 1.95, 1.9, 3.0, 2.72);
    framedImage(s, "screens/intake-queue.png", 1.0, 4.85, 4.9, 1.8, "لقطة: طابور الاستقبال المباشر");
    caption(s, "لوحة المشرف (أعلى) · طابور الاستقبال المباشر (أسفل) — لقطات حقيقية", 0.6, 6.78, 5.7);
    serviceColumn(s, byDomain("mod"), 6.55, 1.8, W - M - 6.55, 6.85);
    notes(s, "المشرف الولائي لا يرى إلا ولايته حتى لو استدعى الواجهة البرمجية مباشرة. هذا مفروض في قاعدة البيانات ومختبَر.");
  }

  // 07 — D4 VOLUNTEER --------------------------------------------------------------
  {
    const s = newSlide("bg-dark-b.png");
    header(s, "vol", "رحلة المتطوّع", "من التسجيل إلى الاقتراح المناسب، ومن الانضمام إلى النادي");
    anim(1, "fade", "after", 600);
    framedImage(s, "gen/svc-profile.png", 0.72, 2.4, 5.45, 2.77);
    caption(s, "صفحة «ملفي»: المطابقة، المشاركات، بطاقة QR، الخصوصية (لقطة حقيقية)", 0.6, 5.35, 5.7);
    serviceColumn(s, byDomain("vol"), 6.55, 1.8, W - M - 6.55, 6.85);
    notes(s, "المشاركة لا تُحتسب بمجرد الضغط على «أستطيع المساعدة»: يجب أن يؤكّدها المشرف أو يُسجَّل الحضور برمز QR.");
  }

  // 08 — D5 RECOGNITION -------------------------------------------------------------
  {
    const s = newSlide("bg-dark-a.png");
    header(s, "rec", "الاعتراف والتوثيق", "كل نقطة وكل ساعة وكل شهادة مبنية على فعل مؤكَّد — لا يمكن منحها ذاتياً");
    anim(1, "zoom", "after", 500);
    framedImage(s, "screens/qr-card.png", 3.45, 2.1, 2.7, 2.25, "لقطة: بطاقة الحضور برمز QR");
    anim(2, "zoom", "after", 500);
    framedImage(s, "gen/svc-badges.png", 0.72, 2.1, 2.5, 1.81, "لقطة: الشارات");
    caption(s, "بطاقة حضور موقّعة · الشارات (لقطات حقيقية)", 0.6, 4.55, 5.7);
    anim(3, "fade", "after", 500);
    card(s, 0.72, 5.0, 5.45, 1.25, { fill: C.navy2 });
    text(s, [{ text: "التحقّق من شهادة\n", options: { bold: true, color: C.cyan } },
      { text: "لكل شهادة رابط عام يعرض صاحبها وساعاته المؤكَّدة وصحّة توقيعها. أي تعديل على الشهادة يُبطل التوقيع.", options: { color: C.muted } }],
      { x: 0.95, y: 5.1, w: 5.0, h: 1.1, fontSize: 13, lineSpacingMultiple: 1.1 });
    serviceColumn(s, byDomain("rec"), 6.55, 1.8, W - M - 6.55, 6.85, 4);
    notes(s, "رمز QR يُوقَّع ويُتحقَّق منه داخل قاعدة البيانات، ولا يمكن إعادة استعماله. والنقاط تُحتسب مرة واحدة فقط لكل نشاط.");
  }

  // 09 — D6a BLOOD + IN-KIND -------------------------------------------------------
  {
    const s = newSlide("bg-dark-b.png");
    header(s, "hum", "العمل الإنساني (1/2): الدم والتبرّعات العينية", "الخدمات 18 إلى 22 — الجزء الأول");
    anim(1, "fade", "after", 600);
    framedImage(s, "gen/svc-donors.png", 0.72, 1.9, 5.45, 4.29);
    caption(s, "شبكة المتبرّعين بالدم: تسجيل بموافقة وجدول توافق (لقطة حقيقية)", 0.6, 6.35, 5.7);
    serviceColumn(s, byDomain("hum").slice(0, 2), 6.55, 1.8, W - M - 6.55, 6.85);
    notes(s, "إيثار لا تقرّر الأهلية الطبية للتبرّع: هذا دور مركز حقن الدم. المنصة تخطر المتوافقين فقط، دون كشف هوية المتبرّع أو صاحب النداء.");
  }

  // 10 — D6b ASSOCIATIONS + CAMPAIGNS + TREES ---------------------------------------
  {
    const s = newSlide("bg-dark-a.png");
    header(s, "hum", "العمل الإنساني (2/2): الجمعيات والحملات والبيئة", "الخدمات 18 إلى 22 — الجزء الثاني");
    anim(1, "fade", "after", 600);
    framedImage(s, "gen/campaign-top.png", 0.72, 1.95, 5.45, 4.13);
    caption(s, "حملة «قفة رمضان» تجريبية: تقدّم فعلي ومنع تكرار المستفيد (لقطة حقيقية)", 0.6, 6.25, 5.7);
    serviceColumn(s, byDomain("hum").slice(2), 6.55, 1.8, W - M - 6.55, 6.85);
    notes(s, "منع تكرار المستفيد يعمل ببصمة مشفّرة على الخادم: الجمعية تعرف أن الأسرة مسجّلة في الحملة، دون أن تعرف أين أو أي بيانات عنها.");
  }

  // 11 — D7 CRISIS ------------------------------------------------------------------
  {
    const s = newSlide("bg-dark-b.png");
    const crisis = byDomain("crisis")[0];
    header(s, "crisis", "الطوارئ والأزمات", `الخدمة ${crisis.n}: وضع الأزمات والملاجئ والتنبيهات`);
    const flow = [["إعلان حالة طوارئ", "من المدير الولائي أو الوزارة", "Siren"], ["شريط تنبيه في الولاية", "يظهر لكل زوّار المنصة فيها", "Megaphone"],
      ["صفحة الأزمة والملاجئ", "مراكز إيواء حقيقية فقط وطاقتها", "Home"], ["تنبيه SMS", "لمن وافق مسبقاً، بعد تأكيد عدد المستلمين", "Smartphone"], ["تأكيد بالرد «1»", "يُسجَّل المتطوّع المستعدّ", "CheckCircle2"]];
    const fw = 2.22, gap = 0.27;
    flow.forEach(([h, d, ic], i) => {
      const x = W - M - fw - i * (fw + gap), col = i % 2 ? C.purple : C.cyan;
      anim(1 + 2 * i, "rise", "after", 400);
      card(s, x, 1.95, fw, 2.3, { fill: C.navy, line: i === 3 ? C.purple : C.line });
      iconBadge(s, ic, x + fw / 2 - 0.36, 2.15, 0.72, col);
      text(s, h, { x: x + 0.12, y: 2.95, w: fw - 0.24, h: 0.62, fontSize: 15, bold: true, align: "center", valign: "middle" });
      text(s, d, { x: x + 0.12, y: 3.6, w: fw - 0.24, h: 0.6, fontSize: 12, color: C.muted, align: "center" });
      if (i < 4) {
        anim(2 + 2 * i, "wipe", "after", 200);
        s.addShape(pres.shapes.LINE, { x: x - gap + 0.04, y: 3.1, w: gap - 0.08, h: 0, line: { color: C.muted, width: 1.5, endArrowType: "triangle" }, flipH: true });
      }
    });
    const facts = [["ملاجئ حقيقية فقط", "لا تُعرض إلا مراكز إيواء أدخلها مسؤول وأكّد توفّرها. لا بيانات وهمية.", C.cyan],
      ["حماية من الإرسال الخاطئ", "قبل أي إرسال حقيقي يظهر عدد المستلمين ويُطلب تأكيد صريح. كل إرسال مسجَّل.", C.cyan],
      ["الحالة الحالية بصدق", "في بيئة التطوير تُطبع الرسائل في السجلّ فقط. محوّل Twilio مبني وغير مفعّل. لم تُرسَل أي رسالة حقيقية.", C.purple]];
    const cw = (W - 2 * M - 0.4) / 3;
    facts.forEach(([h, d, col], i) => {
      const x = W - M - cw - i * (cw + 0.2);
      anim(20 + i, "fade", i ? "after" : "click", 400);
      card(s, x, 4.6, cw, 1.75, { fill: C.navy2, line: col });
      text(s, h, { x: x + 0.22, y: 4.75, w: cw - 0.44, h: 0.4, fontSize: 16, bold: true, color: col });
      text(s, d, { x: x + 0.22, y: 5.2, w: cw - 0.44, h: 1.05, fontSize: 13, color: C.muted, lineSpacingMultiple: 1.08 });
    });
    anim(30, "fade", "after", 400);
    pill(s, stLabel(crisis), W - M - 3.0, 6.55, 3.0, C.purple, { h: 0.32, fontSize: 11 });
    latin(s, crisis.route, { x: M, y: 6.58, w: 2.0, h: 0.28, fontSize: 10, color: C.muted, align: "left" });
    notes(s, "لا نرسل أي رسالة حقيقية دون موافقة صريحة ومزوّد معتمد. هذا قرار مقصود.");
  }

  // 12 — D8 IMPACT ------------------------------------------------------------------
  {
    const s = newSlide("bg-dark-a.png");
    header(s, "impact", "الأثر والبيانات", "أرقام محسوبة من السجلات الفعلية — لا تقديرات ولا أرقام مضافة");
    anim(1, "fade", "after", 600);
    framedImage(s, "gen/svc-impact.png", 0.72, 2.3, 5.45, 2.84);
    caption(s, "صفحة «شفافية الأثر» ببيانات تجريبية (لقطة حقيقية)", 0.6, 5.3, 5.7);
    serviceColumn(s, byDomain("impact"), 6.55, 1.8, W - M - 6.55, 6.85);
    notes(s, "الأرقام في اللقطة من بيانات تجريبية أدخلناها بأنفسنا، وليست نشاطاً حقيقياً.");
  }

  // 13 — D9 PRIVACY & PLATFORM -------------------------------------------------------
  {
    const s = newSlide("bg-dark-b.png");
    header(s, "platform", "الخصوصية والمنصة", "مبنية على مبادئ القانون 18-07 لحماية المعطيات الشخصية");
    anim(1, "fade", "after", 600);
    framedImage(s, "gen/svc-privacy.png", 0.72, 1.95, 5.45, 1.0, "لقطة: بياناتي وخصوصيتي");
    const sec = [["KeyRound", "صلاحيات على مستوى الصفوف في كل جدول"], ["Database", "69 اختبار أمان لقاعدة البيانات — ناجحة"], ["Eye", "رقم الهاتف لا يُعرض للعموم أبداً"],
      ["Map", "الموقع العام على مستوى الولاية فقط"], ["Lock", "صور ووثائق في تخزين خاص"], ["ShieldCheck", "ترويسات أمان وسياسة CSP"]];
    sec.forEach(([ic, t], i) => {
      const y = 3.25 + i * 0.58;
      anim(2 + i, "rise", "after", 260);
      iconBadge(s, ic, 5.72, y, 0.44, C.cyan);
      text(s, t, { x: 0.72, y, w: 4.88, h: 0.44, fontSize: 14, valign: "middle" });
    });
    serviceColumn(s, byDomain("platform"), 6.55, 1.8, W - M - 6.55, 6.85, 10);
    notes(s, "صمّمنا وفق مبادئ القانون 18-07، لكن لم تراجع جهة قانونية هذا الامتثال بعد، ولم نقم بأي تصريح رسمي. لا ندّعي اعتماداً.");
  }

  // 14 — STATUS MATRIX: every service -------------------------------------------------
  {
    const s = newSlide("bg-dark-a.png");
    text(s, `كل الخدمات الـ${S.length}… وحالتها الحقيقية`, { x: M, y: 0.42, w: W - 2 * M, h: 0.78, fontSize: 30, bold: true, valign: "middle" });
    text(s, [{ text: "● ", options: { color: C.cyan } }, { text: `${N_OK} تعمل ومختبَرة محلياً`, options: {} }, { text: "      ● ", options: { color: C.purple } }, { text: `${N_PART} جزئية أو بانتظار مفاتيح ومزوّدين`, options: {} },
      { text: "      ·  لا شيء منشور للعموم بعد", options: { color: C.muted } }], { x: M, y: 1.2, w: W - 2 * M, h: 0.4, fontSize: 15 });
    const cols = 3, perCol = Math.ceil(S.length / cols), cw = (W - 2 * M - 0.3) / cols, rh = 0.43;
    S.forEach((sv, i) => {
      const c = Math.floor(i / perCol), r = i % perCol, x = W - M - cw - c * (cw + 0.15), y = 1.78 + r * rh, col = stColor(sv);
      anim(1 + c, "fade", "after", 500);
      card(s, x, y, cw, rh - 0.07, { fill: sv.st === "ok" ? C.navy : C.navy2, line: sv.st === "ok" ? C.navy : C.purple, r: 0.08 });
      latin(s, String(sv.n), { x: x + cw - 0.48, y, w: 0.36, h: rh - 0.07, fontSize: 11, bold: true, color: col, align: "center", valign: "middle" });
      text(s, sv.name, { x: x + 0.45, y, w: cw - 0.98, h: rh - 0.07, fontSize: 12.5, valign: "middle" });
      s.addShape(pres.shapes.OVAL, { x: x + 0.16, y: y + (rh - 0.07) / 2 - 0.08, w: 0.16, h: 0.16, fill: { color: col }, line: { color: col, width: 0.5 } });
    });
    anim(10, "rise", "click", 500);
    card(s, M, 6.18, W - 2 * M, 0.72, { fill: C.purple, t: 88, line: C.purple });
    text(s, [{ text: "ما يلزم للتشغيل الفعلي:  ", options: { bold: true, color: C.purple } },
      { text: "مفتاح Claude · حسابات تيليغرام وواتساب الرسمية · مزوّد SMS · استضافة ونطاق وبريد · اختبار على هواتف حقيقية · إكمال الفرنسية · مراجعة قانونية", options: { color: C.white } }],
      { x: M + 0.25, y: 6.18, w: W - 2 * M - 0.5, h: 0.72, fontSize: 13, valign: "middle" });
    notes(s, "هذه الشريحة هي مرجع الصدق: كل خدمة ورقمها ولونها. السماوي = تعمل ومختبَرة محلياً. البنفسجي = جزئية أو تنتظر مفاتيح أو مزوّداً أو اختباراً على جهاز.");
  }

  // 15 — CLOSE ---------------------------------------------------------------------
  {
    const s = newSlide("bg-close.png");
    anim(1, "fade", "after", 1200);
    text(s, [{ text: "منصة واحدة… ", options: {} }, { text: `${S.length} خدمة`, options: { color: C.cyan } }, { text: "…", options: { breakLine: true } }, { text: "وهدف واحد: ", options: {} }, { text: "أن يصل الخير.", options: { color: C.purple } }],
      { x: 3.2, y: 1.1, w: W - M - 3.2, h: 2.3, fontSize: 44, bold: true, lineSpacingMultiple: 1.2, valign: "middle" });
    anim(2, "zoom", "after", 600);
    s.addImage({ altText: "شعار إيثار", path: A("gen/logo.png"), x: W - M - 0.8, y: 3.8, w: 0.8, h: 0.8 });
    anim(2, "fade", "with", 800);
    text(s, [{ text: "إيثار", options: { bold: true } }, { text: " — لأن الخير عندما يتنظّم، يصل أبعد.", options: { color: C.muted } }], { x: 3.2, y: 3.87, w: W - M - 4.2, h: 0.65, fontSize: 22, valign: "middle" });
    anim(3, "rise", "after", 600);
    text(s, "خطوتنا التالية: تجربة ميدانية في ولاية واحدة، مع جمعية شريكة ومديرية ولائية.", { x: 2.6, y: 5.3, w: W - M - 2.6, h: 0.5, fontSize: 18, bold: true, color: C.cyan, valign: "middle" });
    anim(4, "fade", "after", 600);
    const qr = await QRCode.toDataURL(REPO_URL, { margin: 2, width: 600, color: { dark: "#090E1A", light: "#F5F7FA" } });
    s.addImage({ altText: "رمز QR لمستودع المشروع", data: qr, x: M, y: 4.6, w: 1.45, h: 1.45 });
    text(s, "مستودع المشروع", { x: M, y: 6.1, w: 1.45, h: 0.3, fontSize: 11, color: C.muted, align: "center" });
    notes(s, "اختم بالخطوة التالية المحدّدة. رمز QR يقود إلى مستودع المشروع؛ تحقّق أنه متاح للعموم قبل العرض أو استبدله برابط تجريبي.");
  }

  noAnim();
  await pres.writeFile({ fileName: OUTFILE });
  const stats = await require("./animate.js").animate(OUTFILE);
  console.log("written", OUTFILE, stats, { services: S.length, ok: N_OK, part: N_PART });
})();
