/**
 * DEMO DATA ONLY — fictional people, numbers and posts for the hackathon pitch.
 * Never run against a production project that holds real data.
 *
 *   npm run seed:demo                       # seed (idempotent: removes the previous demo set first)
 *   npm run seed:demo -- --admin=you@mail   # also make that existing/new account ministry admin
 *   npm run seed:demo -- --reset            # remove all demo data and stop
 *
 * Alerts are NOT inserted directly: each demo post goes through the real 7-stage pipeline
 * (Claude when ANTHROPIC_API_KEY is set, rules otherwise), exactly like a live submission.
 * Every demo account uses the @demo.athar.dz domain and every demo phone is 0555 00 0x xx,
 * so the whole set is recognisable and removable.
 */
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { processIntake } from "@/lib/pipeline/run";
import { contentHash, keyedHash } from "@/lib/pipeline/hash";
import { canonicalText, normalizePhone } from "@/lib/pipeline/text";
import { findWilaya } from "@/lib/wilayas";

const DOMAIN = "demo.athar.dz";
const db = supabaseAdmin();
const args = process.argv.slice(2);
const adminEmail = args.find((a) => a.startsWith("--admin="))?.slice(8);
const day = 86_400_000;
const ago = (days: number, hours = 0) => new Date(Date.now() - days * day - hours * 3_600_000).toISOString();
const ahead = (days: number) => new Date(Date.now() + days * day).toISOString();

function mustId(r: { data: unknown; error: { message: string } | null }, what: string): { id: string } {
  if (r.error || !r.data) throw new Error(`${what}: ${r.error?.message ?? "no data"}`);
  return r.data as { id: string };
}

async function createUser(attrs: Parameters<typeof db.auth.admin.createUser>[0]) {
  const { data, error } = await db.auth.admin.createUser(attrs);
  if (error || !data.user) throw new Error(`user ${attrs.email}: ${error?.message ?? "no user"}`);
  return data.user;
}

function must<T>(r: { data: T | null; error: { message: string } | null }, what: string): NonNullable<T> {
  if (r.error || r.data === null) throw new Error(`${what}: ${r.error?.message ?? "no data"}`);
  return r.data as NonNullable<T>;
}

// ---------------------------------------------------------------- reset
async function reset() {
  const ids: string[] = [];
  for (let page = 1; ; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 200 });
    const users = data?.users ?? [];
    ids.push(...users.filter((u) => u.email?.endsWith(`@${DOMAIN}`)).map((u) => u.id));
    if (users.length < 200) break;
  }
  // Content that would otherwise survive user deletion (owner set null) is removed explicitly.
  if (ids.length) {
    await db.from("crises").delete().in("started_by", ids);
    await db.from("campaigns").delete().in("created_by", ids);
    await db.from("club_activities").delete().in("created_by", ids);
    await db.from("clubs").delete().in("created_by", ids);
  }
  const { data: demoIntake } = await db.from("intake_items").select("id, alert_id").like("source_label", "DEMO%");
  const alertIds = (demoIntake ?? []).map((i) => i.alert_id).filter(Boolean) as string[];
  if (alertIds.length) {
    await db.from("alerts").update({ merged_into: null, status: "rejected" }).in("merged_into", alertIds);
    await db.from("intake_items").update({ alert_id: null }).in("alert_id", alertIds);
    await db.from("alerts").delete().in("id", alertIds);
  }
  await db.from("intake_items").delete().like("source_label", "DEMO%");
  await db.from("historical_posts").delete().eq("source", "import").like("normalized_text", "%0555 00 0%");
  await db.from("historical_posts").delete().like("normalized_text", "%055500%");
  await db.from("shelters").delete().like("name", "%(تجريبي)%");
  await db.from("institutions").delete().eq("source", "DEMO");
  for (const id of ids) await db.auth.admin.deleteUser(id);
  console.log(`reset: removed ${ids.length} demo accounts and ${alertIds.length} demo alerts`);
}

// ---------------------------------------------------------------- people
type Person = { key: string; name: string; wilaya: number; skills: string[]; blood?: string; roles?: { role: string; wilaya?: number }[] };
const PEOPLE: Person[] = [
  { key: "ministry", name: "مديرية الحياة الجمعوية (تجريبي)", wilaya: 16, skills: [], roles: [{ role: "ministry_admin" }] },
  { key: "djsl16", name: "مديرية الشباب — الجزائر (تجريبي)", wilaya: 16, skills: [], roles: [{ role: "djsl_admin", wilaya: 16 }] },
  { key: "djsl31", name: "مديرية الشباب — وهران (تجريبي)", wilaya: 31, skills: [], roles: [{ role: "djsl_admin", wilaya: 31 }] },
  { key: "mod9", name: "مشرف البليدة (تجريبي)", wilaya: 9, skills: [], roles: [{ role: "moderator", wilaya: 9 }] },
  { key: "amina", name: "أمينة ب.", wilaya: 16, skills: ["إسعافات أولية", "تنظيم"], blood: "O-", roles: [{ role: "club_lead" }] },
  { key: "yacine", name: "ياسين ك.", wilaya: 16, skills: ["سياقة", "حمل ونقل"], blood: "O+" },
  { key: "sara", name: "سارة م.", wilaya: 31, skills: ["تدريس", "تصميم"], blood: "A+", roles: [{ role: "club_lead" }] },
  { key: "walid", name: "وليد ح.", wilaya: 31, skills: ["سياقة", "طبخ"], blood: "B+" },
  { key: "imene", name: "إيمان ر.", wilaya: 25, skills: ["تمريض", "إسعافات أولية"], blood: "AB+", roles: [{ role: "club_lead" }] },
  { key: "anis", name: "أنيس ز.", wilaya: 25, skills: ["تصوير", "تواصل"], blood: "O+" },
  { key: "khadidja", name: "خديجة س.", wilaya: 9, skills: ["طبخ", "تنظيم"], blood: "A-" },
  { key: "rayan", name: "ريان ب.", wilaya: 19, skills: ["حمل ونقل", "بناء"], blood: "O-" },
  { key: "nour", name: "نور الهدى ع.", wilaya: 6, skills: ["تدريس", "لغات"], blood: "B-" },
  { key: "mehdi", name: "مهدي ت.", wilaya: 42, skills: ["غطس", "إسعافات أولية"], blood: "A+" },
  { key: "lina", name: "لينة د.", wilaya: 15, skills: ["تصميم", "تواصل"], blood: "O+" },
  { key: "hamza", name: "حمزة ل.", wilaya: 5, skills: ["سياقة", "بناء"], blood: "B+" },
  { key: "assoc", name: "جمعية نسيم الخير (تجريبي)", wilaya: 16, skills: [], roles: [{ role: "association" }] },
];

async function createPeople() {
  const ids: Record<string, string> = {};
  for (const p of PEOPLE) {
    const email = `${p.key}@${DOMAIN}`;
    const id = (await createUser({ email, email_confirm: true, user_metadata: { display_name: p.name } })).id;
    ids[p.key] = id;
    must(await db.from("profiles").update({ display_name: p.name, wilaya_code: p.wilaya, skills: p.skills, onboarded: true }).eq("id", id), "profile");
    if (p.blood) await db.from("profile_private").update({ blood_type: p.blood } as never).eq("user_id", id);
    for (const r of p.roles ?? []) {
      must(await db.from("user_roles").upsert({ user_id: id, role: r.role as never, wilaya_code: r.wilaya ?? null }), "role");
    }
    await db.from("consents").insert(["terms", ...(p.blood ? ["blood_data", "donor_registry"] : [])]
      .map((purpose) => ({ user_id: id, purpose, version: "demo" })) as never);
  }
  if (adminEmail) {
    const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
    let user = data?.users.find((u) => u.email?.toLowerCase() === adminEmail.toLowerCase());
    if (!user) user = await createUser({ email: adminEmail, email_confirm: true });
    must(await db.from("user_roles").upsert({ user_id: user.id, role: "ministry_admin" as never, wilaya_code: null }), "admin role");
    console.log(`ministry_admin granted to ${adminEmail}`);
  }
  return ids;
}

// ---------------------------------------------------------------- archive (for recycled detection)
const ARCHIVE = [
  { text: "عاجل ونداء لكل الخاوة: عائلة في بوفاريك ولاية البليدة دارهم طاحت وما عندهمش وين يباتو، يحتاجو أفرشة وأغطية وماكلة. شاركو المنشور ربي يجازيكم. للتواصل 0555 00 09 01", wilaya: 9, cat: "relief", seen: "2021-01-14", times: 47, resolved: "2021-01-20" },
  { text: "طفل عمره 6 سنين يحتاج عملية قلب مستعجلة فرنسا، العائلة تطلب المساعدة. CCP رقم 0000000 مفتاح 00. شاركو عافاكم 0555 00 09 02", wilaya: 25, cat: "medical", seen: "2019-06-02", times: 112, resolved: null },
  { text: "مطلوب متبرعين بالدم فصيلة AB- مستعجل بمستشفى وهران الجامعي. اتصلوا 0555 00 09 03", wilaya: 31, cat: "blood", seen: "2022-03-09", times: 23, resolved: "2022-03-10" },
  { text: "حملة تنظيف شاطئ تيشي ببجاية يوم الجمعة، كل الشباب مرحبا بيهم. للتسجيل 0555 00 09 04", wilaya: 6, cat: "cleanup", seen: "2023-07-21", times: 6, resolved: "2023-07-28" },
];

async function seedArchive() {
  for (const a of ARCHIVE) {
    const phones = (a.text.match(/0[5-7](?:[\s.-]?\d{2}){4}/g) ?? []).map((p) => normalizePhone(p)).filter(Boolean) as string[];
    must(await db.from("historical_posts").upsert({
      content_hash: contentHash(a.text), normalized_text: canonicalText(a.text), phone_hashes: phones.map(keyedHash),
      category: a.cat as never, wilaya_code: a.wilaya, first_seen_at: a.seen, last_seen_at: a.resolved ?? a.seen,
      times_seen: a.times, resolved_at: a.resolved, source: "import",
    }, { onConflict: "content_hash" }), "archive");
  }
}

// ---------------------------------------------------------------- posts → real pipeline
type Post = { text: string; channel: "web_form" | "telegram" | "whatsapp" | "moderator_paste"; daysAgo: number; outcome: "approve" | "pending" | "resolve" | "keep"; by?: string; joiners?: string[] };
const POSTS: Post[] = [
  { text: "خاوتي نحتاجو متبرعين بالدم فصيلة O- فسبيطار مصطفى باشا بالعاصمة، مريضة دارت عملية ولازم قبل الليلة. اللي يقدر يجي يتصل 0555 00 01 01", channel: "whatsapp", daysAgo: 0, outcome: "approve", joiners: ["amina", "rayan"] },
  { text: "نداء عاجل: طفل في مصلحة الأطفال بمستشفى قسنطينة الجامعي يحتاج دم فصيلة A+، 3 أكياس. للتواصل 0555 00 01 02", channel: "telegram", daysAgo: 0, outcome: "approve", joiners: ["anis"] },
  { text: "فيضانات في بلدية الحراش، عائلات راهم يحتاجو أغطية وماكلة وحليب الأطفال. نتلاقاو في دار الشباب الحراش العشية. 0555 00 01 03", channel: "web_form", daysAgo: 1, outcome: "approve", joiners: ["yacine", "amina"] },
  { text: "حملة تنظيف غابة كانستال بوهران نهار السبت الصباح، جيبو معاكم القفازات. نحتاجو 40 متطوع. 0555 00 01 04", channel: "web_form", daysAgo: 2, outcome: "approve", by: "sara", joiners: ["walid", "sara"] },
  { text: "دار العجزة بسطيف تحتاج متطوعين لزيارة المسنين وتنشيط مساء الخميس، وكذلك أدوية الضغط والسكري. 0555 00 01 05", channel: "telegram", daysAgo: 2, outcome: "approve", joiners: ["rayan"] },
  { text: "دروس دعم مجانية لتلاميذ البكالوريا في الرياضيات والفيزياء بدار الشباب بجاية، نحتاجو أساتذة متطوعين. 0555 00 01 06", channel: "web_form", daysAgo: 3, outcome: "approve", by: "nour", joiners: ["nour"] },
  { text: "مطلوب متبرعين فصيلة B+ بمستشفى باتنة، حادث مرور فالطريق الوطني. ضروري اليوم. 0555 00 01 07", channel: "whatsapp", daysAgo: 0, outcome: "approve", joiners: ["hamza"] },
  { text: "تنظيف شاطئ تيبازة وشنوة نهار الجمعة مع نادي الغطس، نحتاجو 25 شاب. 0555 00 01 08", channel: "web_form", daysAgo: 4, outcome: "approve", joiners: ["mehdi"] },
  { text: "عائلة في تيزي وزو فقدت دارها في حريق، يحتاجو حوايج للأطفال وأفرشة. نقطة الجمع دار الشباب المدينة الجديدة. 0555 00 01 09", channel: "telegram", daysAgo: 1, outcome: "approve", joiners: ["lina"] },
  { text: "قفة رمضان: نحتاجو متطوعين لتوزيع 200 قفة على العائلات المعوزة في البليدة، والتغليف في دار الشباب بوفاريك. 0555 00 01 10", channel: "web_form", daysAgo: 5, outcome: "resolve", joiners: ["khadidja"] },
  { text: "حملة تبرع بالدم في جامعة باب الزوار بالتعاون مع مركز حقن الدم، كل الفصائل مرحب بها. 0555 00 01 11", channel: "web_form", daysAgo: 9, outcome: "resolve", joiners: ["yacine", "amina"] },
  { text: "تشجير 500 شجرة في حي سيدي مبروك بقسنطينة، الشتلات متوفرة نحتاجو غير الأيادي. 0555 00 01 12", channel: "web_form", daysAgo: 12, outcome: "resolve", joiners: ["imene", "anis"] },
  { text: "دار الأيتام بوهران تحتاج كتب مدرسية ومحافظ للدخول المدرسي، 60 طفل. 0555 00 01 13", channel: "telegram", daysAgo: 6, outcome: "approve", joiners: ["walid"] },
  { text: "عاجل مريض بالسرطان في المسيلة يحتاج نقل لمركز مكافحة السرطان بالبليدة كل أسبوع، اللي عندو طوموبيل ويقدر يعاون. 0555 00 01 14", channel: "whatsapp", daysAgo: 1, outcome: "pending" },
  { text: "نحتاجو متطوعين يطبخو وجبات ساخنة للأشخاص بدون مأوى فوسط العاصمة كل ليلة جمعة. 0555 00 01 15", channel: "web_form", daysAgo: 0, outcome: "pending" },
  // Same campaign posted again on another channel → duplicate detection
  { text: "حملة تنظيف غابة كانستال وهران يوم السبت صباحا، احضروا القفازات، نحتاج 40 متطوعا. 0555 00 01 04", channel: "telegram", daysAgo: 1, outcome: "keep" },
  // Old post recirculating → recycled detection (matches the archive)
  { text: "عاجل ونداء لكل الخاوة: عائلة في بوفاريك ولاية البليدة دارهم طاحت وما عندهمش وين يباتو، يحتاجو أفرشة وأغطية وماكلة. شاركو المنشور ربي يجازيكم. للتواصل 0555 00 09 01", channel: "whatsapp", daysAgo: 0, outcome: "keep" },
  { text: "طفل عمره 6 سنين يحتاج عملية قلب مستعجلة فرنسا العائلة تطلب المساعدة، شاركو عافاكم 0555 00 09 02", channel: "telegram", daysAgo: 0, outcome: "keep" },
];

async function seedAlerts(ids: Record<string, string>) {
  const out: { id: string; post: Post }[] = [];
  for (const [i, post] of POSTS.entries()) {
    const intake = mustId(await db.from("intake_items").insert({
      channel: post.channel, external_id: `demo-${i}`, raw_text: post.text, content_hash: contentHash(post.text),
      source_label: `DEMO ${post.channel}`, submitter_id: post.by ? ids[post.by] : null, received_at: ago(post.daysAgo, 2 + i % 7),
    }).select("id").single(), "intake");
    const r = await processIntake(intake.id);
    console.log(`  ${String(i + 1).padStart(2)}. ${r.verdict.padEnd(14)} ${String(r.score).padStart(3)} ${r.mode.padEnd(9)} ${post.text.slice(0, 50)}…`);
    if (!r.alertId || r.linkedTo) continue;
    const created = ago(post.daysAgo, 2 + i % 7);
    const patch: Record<string, unknown> = { created_at: created, owner_id: post.by ? ids[post.by] : null };
    if (post.outcome === "approve" || post.outcome === "resolve") Object.assign(patch, { status: "approved", reviewed_at: created, reviewed_by: ids.djsl16 });
    if (post.outcome === "resolve") Object.assign(patch, { status: "resolved", resolved_at: ago(Math.max(0, post.daysAgo - 2)) });
    must(await db.from("alerts").update(patch as never).eq("id", r.alertId), "alert patch");
    out.push({ id: r.alertId, post });
  }
  // Volunteers: resolved alerts are confirmed (points), open ones are joined.
  for (const { id, post } of out) {
    for (const k of post.joiners ?? []) {
      const confirmed = post.outcome === "resolve";
      await db.from("alert_volunteers").upsert({
        alert_id: id, user_id: ids[k], status: confirmed ? "confirmed" : "joined", joined_at: ago(post.daysAgo),
        confirmed_at: confirmed ? ago(Math.max(0, post.daysAgo - 2)) : null, confirmed_by: confirmed ? ids.djsl16 : null,
        hours: confirmed ? 4 : null,
      });
    }
    if (post.outcome === "resolve") {
      await db.from("reports").insert({
        alert_id: id, author_id: ids[post.joiners![0]], organization: "نادي دار الشباب (تجريبي)",
        outcome: "تمت المهمة بنجاح وأُغلق النداء بعد تلبية الحاجة كاملة.", attended_count: 12 + (post.joiners!.length * 3),
        hours_total: 48, status: "approved", reviewed_by: ids.djsl16, reviewed_at: ago(Math.max(0, post.daysAgo - 2)),
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------- community
async function seedCommunity(ids: Record<string, string>) {
  const inst = [
    { name_ar: "دار الشباب الحراش (تجريبي)", wilaya_code: 16, lat: 36.72, lng: 3.14 },
    { name_ar: "دار الشباب المدينة الجديدة (تجريبي)", wilaya_code: 15, lat: 36.71, lng: 4.06 },
    { name_ar: "دار الشباب بوفاريك (تجريبي)", wilaya_code: 9, lat: 36.57, lng: 2.91 },
    { name_ar: "مركز الشباب السانية (تجريبي)", wilaya_code: 31, lat: 35.65, lng: -0.62 },
  ];
  for (const i of inst) await db.from("institutions").upsert({ kind: "youth_house", source: "DEMO", verified: false, ...i }, { onConflict: "kind,wilaya_code,name_ar" });

  const clubs = [
    { key: "c16", name: "نادي نسيم الحراش", wilaya_code: 16, institution_name: "دار الشباب الحراش", focus: ["relief", "blood"], lead: "amina", members: ["yacine", "rayan"] },
    { key: "c31", name: "نادي شباب الباهية الأخضر", wilaya_code: 31, institution_name: "مركز الشباب السانية", focus: ["cleanup", "education"], lead: "sara", members: ["walid"] },
    { key: "c25", name: "نادي الجسور للتطوع", wilaya_code: 25, institution_name: "دار الشباب سيدي مبروك", focus: ["medical", "cleanup"], lead: "imene", members: ["anis"] },
  ];
  const clubIds: Record<string, string> = {};
  for (const c of clubs) {
    const row = mustId(await db.from("clubs").insert({ name: c.name, wilaya_code: c.wilaya_code, institution_name: c.institution_name,
      focus: c.focus as never, created_by: ids[c.lead], description: "نادٍ تطوعي تجريبي لعرض المنصة." }).select("id").single(), "club");
    clubIds[c.key] = row.id;
    await db.from("club_members").insert([{ club_id: row.id, user_id: ids[c.lead], role: "lead" },
      ...c.members.map((m) => ({ club_id: row.id, user_id: ids[m], role: "member" }))]);
    // A past activity with confirmed attendance (points) and a planned one.
    const past = mustId(await db.from("club_activities").insert({ club_id: row.id, title: "حملة تنظيف الحي", wilaya_code: c.wilaya_code,
      starts_at: ago(8), ends_at: ago(8, -3), status: "done", created_by: ids[c.lead], location: c.institution_name }).select("id").single(), "activity");
    for (const m of [c.lead, ...c.members]) {
      await db.from("attendance").insert({ activity_id: past.id, user_id: ids[m], checked_in_by: ids[c.lead], token_nonce: `demo-${randomUUID()}`, hours: 3, checked_in_at: ago(8) });
    }
    await db.from("club_activities").insert({ club_id: row.id, title: "ورشة إسعافات أولية", wilaya_code: c.wilaya_code,
      starts_at: ahead(3), ends_at: ahead(3.1), status: "planned", created_by: ids[c.lead], location: c.institution_name });
  }

  const trees = [
    ["amina", 16, "حديقة الحي — الحراش", "زيتون", 36.72, 3.13], ["yacine", 16, "مدرسة ابتدائية — باب الزوار", "خروب", 36.72, 3.18],
    ["sara", 31, "غابة كانستال", "صنوبر حلبي", 35.73, -0.57], ["walid", 31, "حافة الطريق — السانية", "كاليبتوس", 35.65, -0.61],
    ["imene", 25, "حي سيدي مبروك", "زيتون", 36.36, 6.63], ["anis", 25, "جامعة منتوري", "أرز أطلسي", 36.34, 6.62],
    ["nour", 6, "دار الشباب بجاية", "تين", 36.75, 5.06], ["lina", 15, "ساحة عمومية — تيزي وزو", "بلوط فليني", 36.71, 4.05],
    ["hamza", 5, "غابة بلدية — باتنة", "أرز أطلسي", 35.55, 6.18], ["mehdi", 42, "شاطئ شنوة", "عرعار", 36.61, 2.4],
    ["khadidja", 9, "مستشفى بوفاريك", "ليمون", 36.57, 2.91], ["rayan", 19, "جامعة سطيف", "صنوبر حلبي", 36.19, 5.4],
  ] as const;
  const treeIds: string[] = [];
  for (const [i, [who, w, place, species, lat, lng]] of trees.entries()) {
    const t = mustId(await db.from("trees").insert({ user_id: ids[who], wilaya_code: w, place, species, lat, lng,
      note: "غرستها مع النادي — بيانات تجريبية", status: i < 10 ? "approved" : "pending",
      reviewed_by: i < 10 ? ids.ministry : null, reviewed_at: i < 10 ? ago(i % 6) : null, created_at: ago(i % 6 + 1) }).select("id").single(), "tree");
    treeIds.push(t.id);
  }
  for (const [i, t] of treeIds.slice(0, 10).entries())
    await db.from("tree_likes").insert(["amina", "sara", "anis", "lina", "walid"].slice(0, 1 + (i % 5)).map((k) => ({ tree_id: t, user_id: ids[k] })));

  // Blood donor network
  for (const k of ["amina", "yacine", "rayan", "anis", "walid", "hamza", "khadidja", "imene"]) {
    const p = PEOPLE.find((x) => x.key === k)!;
    await db.from("blood_donors").upsert({ user_id: ids[k], wilaya_code: p.wilaya, available: true, last_donation_at: k === "yacine" ? ago(30).slice(0, 10) : ago(140).slice(0, 10) });
  }

  // Verified association + campaign
  const assoc = mustId(await db.from("associations").insert({ name: "جمعية نسيم الخير (تجريبي)", approval_number: "DEMO-16-0001", wilaya_code: 16,
    description: "جمعية تجريبية لعرض المنصة.", contact_email: `assoc@${DOMAIN}`, applicant_id: ids.assoc, status: "approved",
    reviewed_by: ids.ministry, reviewed_at: ago(10) }).select("id").single(), "association");
  const year = new Date().getFullYear();
  const camps = [
    { kind: "winter", season: `${year}-winter`, title: "حملة الشتاء الدافئ", unit_label: "بطانية", goal_units: 1500, done: 870, wilaya_code: null },
    { kind: "school", season: `${year}-school`, title: "محفظة لكل تلميذ", unit_label: "محفظة", goal_units: 600, done: 512, wilaya_code: 31 },
    { kind: "ramadan", season: `${year + 1}-ramadan`, title: "قفة رمضان", unit_label: "قفة", goal_units: 2000, done: 140, wilaya_code: 9 },
  ];
  for (const c of camps) {
    const row = mustId(await db.from("campaigns").insert({ kind: c.kind, season: c.season, title: c.title, unit_label: c.unit_label,
      goal_units: c.goal_units, wilaya_code: c.wilaya_code, association_id: assoc.id, created_by: ids.ministry,
      description: "حملة تجريبية لعرض المنصة.", starts_on: ago(20).slice(0, 10), ends_on: ahead(40).slice(0, 10) }).select("id").single(), "campaign");
    for (const units of [Math.round(c.done * 0.5), Math.round(c.done * 0.3), c.done - Math.round(c.done * 0.5) - Math.round(c.done * 0.3)])
      await db.from("campaign_contributions").insert({ campaign_id: row.id, units, recorded_by: ids.ministry, note: "تجريبي" });
  }

  // In-kind offers ⇄ needs
  const items = [
    { kind: "offer", category: "clothes", title: "ملابس شتوية للأطفال", quantity: 40, unit: "قطعة", wilaya_code: 16, owner: "yacine" },
    { kind: "need", category: "clothes", title: "ملابس شتوية لأطفال عائلات الحراش", quantity: 30, unit: "قطعة", wilaya_code: 16, owner: "amina" },
    { kind: "offer", category: "transport", title: "سيارة لنقل المرضى أيام السبت", quantity: 1, unit: "سيارة", wilaya_code: 28, owner: "hamza" },
    { kind: "need", category: "school", title: "كتب مدرسية ومحافظ", quantity: 60, unit: "طقم", wilaya_code: 31, owner: "sara" },
    { kind: "offer", category: "service", title: "استشارة طبية مجانية (طب عام)", quantity: 10, unit: "استشارة", wilaya_code: 25, owner: "imene" },
  ];
  for (const it of items) await db.from("donation_items").insert({ kind: it.kind, category: it.category, title: it.title, quantity: it.quantity, unit: it.unit, wilaya_code: it.wilaya_code, owner_id: ids[it.owner] });

  // Shelters (closed until a crisis is declared)
  for (const s of [
    { name: "دار الشباب الحراش (تجريبي)", wilaya_code: 16, lat: 36.72, lng: 3.14, capacity: 80, occupied: 0 },
    { name: "مركب رياضي جواري باب الزوار (تجريبي)", wilaya_code: 16, lat: 36.72, lng: 3.18, capacity: 150, occupied: 0 },
    { name: "دار الشباب بوفاريك (تجريبي)", wilaya_code: 9, lat: 36.57, lng: 2.91, capacity: 60, occupied: 0 },
  ]) await db.from("shelters").insert({ ...s, needs: ["أغطية", "ماء", "حليب أطفال"], is_open: false });
}

async function main() {
  console.log(`Athar demo seed → ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  await reset();
  if (args.includes("--reset")) return;
  const ids = await createPeople();
  console.log(`people: ${Object.keys(ids).length}`);
  await seedArchive();
  console.log(`archive: ${ARCHIVE.length} historical posts`);
  console.log("posts through the real pipeline:");
  const alerts = await seedAlerts(ids);
  await seedCommunity(ids);
  console.log(`done: ${alerts.length} alerts, clubs, trees, donors, campaigns, offers, shelters. Wilaya check: ${findWilaya(16)?.nameAr}`);
  console.log(`Demo logins (local): <key>@${DOMAIN}, codes in Mailpit. Keys: ${PEOPLE.map((p) => p.key).join(", ")}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
