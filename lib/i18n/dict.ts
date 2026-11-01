/**
 * UI dictionaries. Arabic (default, RTL) is the source of truth; French mirrors its shape (type-checked).
 * Functions are allowed for interpolation: dictionaries are imported directly on server and client,
 * only the locale string crosses the server/client boundary.
 */
import type { Category, Urgency } from "@/lib/types";

const ar = {
  meta: { title: "إيثار | منصة التطوع الذكية في الجزائر", description: "إيثار: نداءات تطوع وتبرع بالدم وإغاثة موثّقة بمراجعة بشرية، مع كشف المنشورات القديمة والمكررة، في كل ولايات الجزائر." },
  brand: { name: "إيثار", tagline: "Athar · منصة التطوع", home: "إيثار — الصفحة الرئيسية" },
  skip: "تخطَّ إلى المحتوى",
  nav: {
    main: "التنقل الرئيسي", mobile: "التنقل (الهاتف)", map: "الخريطة", submit: "أرسل نداءً", campaigns: "الحملات", clubs: "النوادي", trees: "غابة إيثار",
    donors: "متبرعو الدم", donations: "تبرعات عينية", associations: "الجمعيات", impact: "الأثر", profile: "ملفي", notifications: "الإشعارات",
    ingest: "المعالجة", admin: "الإشراف", more: "المزيد", login: "دخول", logout: "خروج", language: "Français",
  },
  footer: { disclaimer: "إيثار — منصة تطوعية. درجات المصداقية أداة فرز وليست دليلاً على صحة أي نداء.", privacy: "الخصوصية", impact: "الأثر", submit: "أرسل نداءً" },
  crisis: { banner: "وضع الطوارئ", details: "التفاصيل ونقاط التجمع" },
  category: { blood: "تبرع بالدم", relief: "إغاثة", cleanup: "بيئة", orphans: "أيتام ومسنون", medical: "طبي", education: "تعليم" } as Record<Category, string>,
  urgency: { critical: "حرج", medium: "متوسط", normal: "عادي" } as Record<Urgency, string>,
  portal: {
    crisisMode: (t: string, w: string) => `🚨 وضع الطوارئ — ${t} في ${w}`,
    sheltersOnMap: "مراكز الإيواء/التجمع المفعّلة تظهر على الخريطة (🏛️).",
    noShelters: "لم تُسجَّل بعد مراكز إيواء مفتوحة لهذه الحالة.",
    expectedNeeds: "الاحتياجات المتوقعة:",
    liveBadge: "نداءات راجعها مشرفون — تتحدث مباشرة",
    heroTitle: "الاحتياج الحقيقي، في وقته الحقيقي.",
    heroText: "تصل النداءات عبر الاستمارة وتيليغرام وواتساب والمشرفين، يحللها إيثار ليكشف المنشورات القديمة والمكررة، ثم يراجعها مشرف قبل نشرها هنا.",
    statApproved: "نداء معتمد نشط", statCritical: "حالة حرجة", statFiltered: "منشور قديم/مكرر صُفّي",
    filterAll: "الكل", filterLabel: "تصفية حسب الفئة",
    listTitle: (n: number) => `النداءات النشطة (${n})`, byUrgency: "حسب الاستعجال", listLabel: "قائمة النداءات",
    completeProfile: "أكمل ملفك التطوعي (الولاية، المهارات، الفصيلة) ليقترح عليك إيثار النداءات المناسبة.",
    loginCta: "سجّل الدخول للمشاركة في النداءات، تأكيد حضورك، وجمع ساعات تطوع موثّقة.",
    emptyTitle: "لا توجد نداءات معتمدة حالياً", emptyText: "تظهر هنا النداءات بعد مراجعة مشرف. هل تعرف حاجة حقيقية؟",
    emptyCategory: "لا توجد نداءات نشطة في هذه الفئة حالياً.",
    whySuggested: "لماذا مقترح:", reportsTitle: "إغلاق الحلقة — تقارير ما بعد النشاط", reportsText: "يكتبها صاحب النداء أو مسؤول النادي ويعتمدها مشرف.",
    attended: (n: number) => `${n} حضر`, hours: (n: number) => `${n} ساعة`, shelter: "مركز إيواء",
  },
  card: {
    reviewed: "راجعه مشرف", reviewedTitle: "اعتمده مشرف بعد المراجعة", suggested: "مقترح لك", showOnMap: "عرض على الخريطة",
    volunteers: (j: number, n: number) => `${j}${n > 0 ? `/${n}` : ""} متطوع`, joined: "✓ مسجّل — عرض الاتصال", full: "اكتمل العدد ✓",
    help: (r: number | null) => (r ? `🙋 أستطيع المساعدة (نحتاج ${r})` : "🙋 أستطيع المساعدة"),
  },
  map: { approx: "الموقع تقريبي على مستوى الولاية", openShelter: "مركز إيواء/تجمع مفعّل", capacity: "الطاقة", needs: "الاحتياجات", updated: "آخر تحديث", joinedShort: "✓ مسجّل", help: "🙋 أستطيع المساعدة", need: (n: number) => ` · نحتاج ${n}` },
  helpModal: {
    title: "🙋 أستطيع المساعدة", need: (n: number) => `نحتاج ${n}`, done: "تم تسجيل مشاركتك",
    doneText: "اتصل بالجهة صاحبة النداء للتنسيق. تُحتسب النقاط بعد تأكيد حضورك (QR أو تأكيد صاحب النداء).",
    noPhone: "لا يوجد رقم اتصال لهذا النداء — تابع التحديثات على المنصة.", close: "إغلاق",
    loginFirst: "للمشاركة سجّل الدخول أولاً — هكذا يرى صاحب النداء المتطوعين الحقيقيين فقط ويمكن تأكيد حضورك.", login: "تسجيل الدخول",
    bloodNote: "🩸 أهلية التبرع (الفاصل بين التبرعات، السن، الوزن، الحالة الصحية) يحددها مركز حقن الدم — اتبع تعليماته.",
    consent: "أوافق على أن يرى صاحب النداء والمشرفون اسمي ومشاركتي لتنسيق المساعدة", privacy: "الخصوصية",
    confirm: "تأكيد المشاركة وإظهار رقم الاتصال",
  },
  submit: {
    title: "أرسل نداءً", intro: "اكتب النداء كما هو (بالدارجة أو العربية أو الفرنسية). يحلله إيثار ثم يراجعه مشرف ولايتك قبل ظهوره على الخريطة. لا تنشر معلومات صحية أو عنواناً دقيقاً لشخص دون موافقته.",
    otherChannels: "قنوات أخرى", channelsText: "تيليغرام وواتساب للأعمال: تُفعَّل عند ربط حسابات المنظمة.", assocText: "الجمعيات المعتمدة تحصل على مصداقية أولية أعلى بعد التحقق من رقم الاعتماد.",
    text: "نص النداء *", placeholder: "مثال: نحتاجو متبرعين بالدم فصيلة A- في مستشفى ... قبل الساعة 17:00، للتواصل 05..",
    name: "اسم جهة الاتصال (اختياري)", phone: "رقم الاتصال (اختياري)", phoneNote: "رقم الهاتف لا يظهر علناً: يراه المشرفون والمتطوعون الذين ينضمون للنداء فقط.",
    consent: "أؤكد أن المعلومات صحيحة حسب علمي، وأوافق على معالجتها لغرض تنسيق المساعدة وفق", privacyLink: "سياسة الخصوصية",
    devCaptcha: "وضع التطوير: التحقق من الروبوتات (Turnstile) غير مفعّل.", send: "إرسال للمراجعة",
    received: "وصلنا نداؤك", receivedText: "سيراجعه مشرف قبل نشره.", trackInProfile: "يمكنك متابعة حالته من ملفك.",
    queued: "حُفظ على جهازك — لم يُرسل بعد", queuedText: "لا يوجد اتصال. سيُرسل تلقائياً عند عودة الإنترنت وستظهر رسالة تأكيد.",
    another: "نداء آخر", map: "الخريطة",
    errRate: "أرسلت نداءات كثيرة خلال وقت قصير. حاول بعد 10 دقائق.", errCaptcha: "فشل التحقق من أنك لست روبوتاً.", errGeneric: "تعذّر الإرسال.",
  },
  login: {
    title: "الدخول إلى إيثار", intro: "نرسل لك رمزاً من 6 أرقام على بريدك الإلكتروني. لا كلمة سر.", email: "البريد الإلكتروني", send: "أرسل الرمز",
    codeFor: "الرمز المرسل إلى", confirm: "تأكيد", changeEmail: "تغيير البريد",
    terms: "بالدخول توافق على سياسة الخصوصية. الدخول برقم الهاتف (SMS) يُفعَّل عند ربط مزوّد رسائل.",
    errLink: "انتهت صلاحية الرابط، أعد المحاولة.", errRate: "طلبات كثيرة، انتظر قليلاً ثم أعد المحاولة.", errSend: "تعذّر إرسال الرمز. تحقق من البريد.", errCode: "الرمز غير صحيح أو منتهي الصلاحية.",
  },
  chat: {
    open: "فتح إيثار بوت", close: "إغلاق المساعد", title: "إيثار بوت", subtitle: "يجيب من بيانات المنصة المعتمدة فقط", loginHint: " · سجّل الدخول لرؤية نقاطك",
    hello: "سلام! أنا إيثار بوت. نجاوبك بالدارجة، بالعربية ولا بالفرنسية — غير من النداءات المعتمدة على المنصة.",
    quick: ["وين نقدر نتبرع بالدم اليوم؟", "كاين نداءات في وهران؟", "شحال عندي نقاط؟", "كاين حالة طوارئ؟"],
    typing: "يكتب", input: "اكتب بالدارجة، بالعربية أو بالفرنسية…", inputLabel: "رسالتك", send: "إرسال", rules: "وضع القواعد (بدون نموذج ذكاء اصطناعي)",
    rate: "أسئلة كثيرة، استنى شوية وعاود.", error: "صرا مشكل، عاود من بعد.",
  },
  offline: { title: "لا يوجد اتصال بالإنترنت", text: "الصفحات العامة التي زرتها سابقاً متاحة. النداءات التي تكتبها الآن تُحفظ على جهازك وتُرسل تلقائياً عند عودة الاتصال — ولا تُعتبر مُرسلة قبل ذلك.", emergency: "في حالة طوارئ اتصل بالحماية المدنية (14) أو الإسعاف.",
    banner: "بدون اتصال.", pending: (n: number) => `${n} نداء محفوظ على جهازك بانتظار الإرسال (لم يصل بعد).`, sent: (s: number, r: number) => `أُرسل ${s} نداء محفوظ${r ? `، رُفض ${r}` : ""}.` },
  errors: { title: "حدث خطأ غير متوقع", text: "لم تُفقد أي بيانات أرسلتها سابقاً. أعد المحاولة، وإن تكرر الخطأ أخبر المشرفين", retry: "إعادة المحاولة", notFound: "الصفحة غير موجودة", notFoundText: "ربما حُذف هذا العنصر أو أن الرابط غير صحيح.", backHome: "العودة إلى الخريطة" },
  time: { now: "الآن", min: (n: number) => `منذ ${n} دقيقة`, hour: (n: number) => `منذ ${n} ساعة`, day: (n: number) => `منذ ${n} يوم`, month: (n: number) => `منذ ${n} شهر`, year: (n: number) => `منذ ${n} سنة` },
  adminOnlyArabic: "",
};

export type Dict = typeof ar;

const fr: Dict = {
  meta: { title: "Athar | Plateforme de bénévolat en Algérie", description: "Athar : appels au bénévolat, au don de sang et aux secours vérifiés par des modérateurs, avec détection des publications anciennes et des doublons, dans toutes les wilayas d'Algérie." },
  brand: { name: "Athar", tagline: "إيثار · Plateforme de bénévolat", home: "Athar — accueil" },
  skip: "Aller au contenu",
  nav: {
    main: "Navigation principale", mobile: "Navigation (mobile)", map: "Carte", submit: "Signaler un besoin", campaigns: "Campagnes", clubs: "Clubs", trees: "Forêt Athar",
    donors: "Donneurs de sang", donations: "Dons en nature", associations: "Associations", impact: "Impact", profile: "Mon profil", notifications: "Notifications",
    ingest: "Traitement", admin: "Modération", more: "Plus", login: "Connexion", logout: "Déconnexion", language: "العربية",
  },
  footer: { disclaimer: "Athar — plateforme bénévole. Le score de crédibilité est un outil de tri, pas une preuve qu'un appel est authentique.", privacy: "Confidentialité", impact: "Impact", submit: "Signaler un besoin" },
  crisis: { banner: "Mode urgence", details: "Détails et points de rassemblement" },
  category: { blood: "Don de sang", relief: "Secours", cleanup: "Environnement", orphans: "Orphelins et aînés", medical: "Médical", education: "Éducation" },
  urgency: { critical: "Critique", medium: "Moyen", normal: "Normal" },
  portal: {
    crisisMode: (t, w) => `🚨 Mode urgence — ${t} à ${w}`,
    sheltersOnMap: "Les centres d'hébergement / de rassemblement ouverts apparaissent sur la carte (🏛️).",
    noShelters: "Aucun centre d'hébergement ouvert n'a encore été enregistré pour cette urgence.",
    expectedNeeds: "Besoins attendus :",
    liveBadge: "Appels vérifiés par des modérateurs — mis à jour en direct",
    heroTitle: "Le vrai besoin, au bon moment.",
    heroText: "Les appels arrivent par le formulaire, Telegram, WhatsApp et les modérateurs. Athar les analyse pour repérer les publications anciennes et les doublons, puis un modérateur les vérifie avant publication.",
    statApproved: "appels actifs vérifiés", statCritical: "cas critiques", statFiltered: "anciens / doublons filtrés",
    filterAll: "Tous", filterLabel: "Filtrer par catégorie",
    listTitle: (n) => `Appels actifs (${n})`, byUrgency: "par urgence", listLabel: "Liste des appels",
    completeProfile: "Complétez votre profil (wilaya, compétences, groupe sanguin) pour recevoir des appels adaptés.",
    loginCta: "Connectez-vous pour participer, confirmer votre présence et cumuler des heures de bénévolat vérifiées.",
    emptyTitle: "Aucun appel vérifié pour le moment", emptyText: "Les appels apparaissent ici après vérification par un modérateur. Vous connaissez un vrai besoin ?",
    emptyCategory: "Aucun appel actif dans cette catégorie.",
    whySuggested: "Pourquoi suggéré :", reportsTitle: "Boucler la boucle — rapports après action", reportsText: "Rédigés par l'auteur de l'appel ou le responsable du club, validés par un modérateur.",
    attended: (n) => `${n} présents`, hours: (n) => `${n} h`, shelter: "Centre d'hébergement",
  },
  card: {
    reviewed: "Vérifié", reviewedTitle: "Approuvé par un modérateur", suggested: "Pour vous", showOnMap: "voir sur la carte",
    volunteers: (j, n) => `${j}${n > 0 ? `/${n}` : ""} bénévoles`, joined: "✓ Inscrit — voir le contact", full: "Complet ✓",
    help: (r) => (r ? `🙋 Je peux aider (il en faut ${r})` : "🙋 Je peux aider"),
  },
  map: { approx: "Position approximative (niveau wilaya)", openShelter: "Centre d'hébergement ouvert", capacity: "Capacité", needs: "Besoins", updated: "Mis à jour", joinedShort: "✓ Inscrit", help: "🙋 Je peux aider", need: (n) => ` · il en faut ${n}` },
  helpModal: {
    title: "🙋 Je peux aider", need: (n) => `Il en faut ${n}`, done: "Participation enregistrée",
    doneText: "Contactez l'auteur de l'appel pour vous coordonner. Les points sont comptés après confirmation de votre présence (QR ou confirmation de l'auteur).",
    noPhone: "Pas de numéro pour cet appel — suivez les mises à jour sur la plateforme.", close: "Fermer",
    loginFirst: "Connectez-vous pour participer : l'auteur ne voit ainsi que de vrais bénévoles, et votre présence peut être confirmée.", login: "Se connecter",
    bloodNote: "🩸 L'éligibilité au don (intervalle, âge, poids, santé) est décidée par le centre de transfusion — suivez ses consignes.",
    consent: "J'accepte que l'auteur de l'appel et les modérateurs voient mon nom et ma participation pour coordonner l'aide", privacy: "Confidentialité",
    confirm: "Confirmer et afficher le contact",
  },
  submit: {
    title: "Signaler un besoin", intro: "Écrivez l'appel tel quel (darija, arabe ou français). Athar l'analyse, puis un modérateur de votre wilaya le vérifie avant publication. Ne publiez pas d'informations médicales ni l'adresse précise d'une personne sans son accord.",
    otherChannels: "Autres canaux", channelsText: "Telegram et WhatsApp Business : activés une fois les comptes de l'organisation connectés.", assocText: "Les associations agréées démarrent avec une crédibilité plus élevée après vérification de leur numéro d'agrément.",
    text: "Texte de l'appel *", placeholder: "Ex. : besoin de donneurs de sang A- à l'hôpital ... avant 17h00, contact 05..",
    name: "Nom du contact (facultatif)", phone: "Téléphone du contact (facultatif)", phoneNote: "Le numéro n'est pas public : seuls les modérateurs et les bénévoles inscrits le voient.",
    consent: "Je confirme l'exactitude de ces informations à ma connaissance et j'accepte leur traitement pour coordonner l'aide, selon la", privacyLink: "politique de confidentialité",
    devCaptcha: "Mode développement : la vérification anti-robot (Turnstile) n'est pas activée.", send: "Envoyer pour vérification",
    received: "Appel reçu", receivedText: "Un modérateur le vérifiera avant publication.", trackInProfile: "Vous pouvez suivre son statut depuis votre profil.",
    queued: "Enregistré sur votre appareil — pas encore envoyé", queuedText: "Pas de connexion. Il sera envoyé automatiquement au retour d'Internet, avec une confirmation.",
    another: "Autre appel", map: "Carte",
    errRate: "Trop d'envois en peu de temps. Réessayez dans 10 minutes.", errCaptcha: "La vérification anti-robot a échoué.", errGeneric: "Envoi impossible.",
  },
  login: {
    title: "Connexion à Athar", intro: "Nous vous envoyons un code à 6 chiffres par e-mail. Pas de mot de passe.", email: "Adresse e-mail", send: "Envoyer le code",
    codeFor: "Code envoyé à", confirm: "Valider", changeEmail: "Changer d'adresse",
    terms: "En vous connectant, vous acceptez la politique de confidentialité. La connexion par SMS sera activée avec un fournisseur de SMS.",
    errLink: "Le lien a expiré, réessayez.", errRate: "Trop de demandes, patientez un instant.", errSend: "Impossible d'envoyer le code. Vérifiez l'adresse.", errCode: "Code incorrect ou expiré.",
  },
  chat: {
    open: "Ouvrir Athar Bot", close: "Fermer l'assistant", title: "Athar Bot", subtitle: "Répond uniquement à partir des données vérifiées", loginHint: " · connectez-vous pour voir vos points",
    hello: "Bonjour ! Je suis Athar Bot. Je réponds en français, en arabe ou en darija — uniquement à partir des appels vérifiés de la plateforme.",
    quick: ["Où donner mon sang aujourd'hui ?", "Des appels à Oran ?", "Combien de points ai-je ?", "Y a-t-il une urgence ?"],
    typing: "écrit", input: "Écrivez en français, en arabe ou en darija…", inputLabel: "Votre message", send: "Envoyer", rules: "Mode règles (sans modèle d'IA)",
    rate: "Trop de questions, patientez un peu.", error: "Un problème est survenu, réessayez.",
  },
  offline: { title: "Pas de connexion Internet", text: "Les pages publiques déjà consultées restent disponibles. Les appels rédigés maintenant sont gardés sur votre appareil et envoyés au retour de la connexion — ils ne sont pas considérés comme envoyés avant.", emergency: "En cas d'urgence, appelez la Protection civile (14) ou le SAMU.",
    banner: "Hors ligne.", pending: (n) => `${n} appel(s) enregistré(s) sur l'appareil, en attente d'envoi (pas encore reçu(s)).`, sent: (s, r) => `${s} appel(s) enregistré(s) envoyé(s)${r ? `, ${r} refusé(s)` : ""}.` },
  errors: { title: "Une erreur inattendue s'est produite", text: "Aucune donnée déjà envoyée n'est perdue. Réessayez ; si l'erreur persiste, prévenez les modérateurs", retry: "Réessayer", notFound: "Page introuvable", notFoundText: "Cet élément a peut-être été supprimé ou le lien est incorrect.", backHome: "Retour à la carte" },
  time: { now: "à l'instant", min: (n) => `il y a ${n} min`, hour: (n) => `il y a ${n} h`, day: (n) => `il y a ${n} j`, month: (n) => `il y a ${n} mois`, year: (n) => `il y a ${n} an${n > 1 ? "s" : ""}` },
  adminOnlyArabic: "Les espaces de modération et d'administration sont pour l'instant en arabe uniquement.",
};

export const LOCALES = ["ar", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ar";
export const LOCALE_COOKIE = "athar_locale";
export const dictionaries: Record<Locale, Dict> = { ar, fr };
export const isLocale = (v: unknown): v is Locale => v === "ar" || v === "fr";
export const dirOf = (l: Locale) => (l === "ar" ? "rtl" : "ltr");

export function timeAgoIn(t: Dict["time"], iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return t.now;
  if (m < 60) return t.min(m);
  const h = Math.floor(m / 60);
  if (h < 24) return t.hour(h);
  const d = Math.floor(h / 24);
  if (d < 30) return t.day(d);
  const mo = Math.floor(d / 30);
  return mo < 12 ? t.month(mo) : t.year(Math.floor(mo / 12));
}
