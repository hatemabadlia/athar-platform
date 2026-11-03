import { PRIVACY_POLICY_VERSION } from "@/lib/consent";
import { getLocale } from "@/lib/i18n/server";

export const metadata = { title: "سياسة الخصوصية · Confidentialité" };

/** Plain-language notice. Legal review by the operating organisation is still required (see docs/PRIVACY.md). */
export default async function PrivacyPage() {
  if ((await getLocale()) === "fr") return <PrivacyFr />;
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 space-y-5 text-sm leading-relaxed text-slate-700">
      <h1 className="text-3xl font-black text-slate-900">سياسة الخصوصية</h1>
      <p className="text-xs text-slate-500">النسخة {PRIVACY_POLICY_VERSION}. مستلهمة من القانون 18-07 المتعلق بحماية الأشخاص الطبيعيين في مجال معالجة المعطيات ذات الطابع الشخصي. هذه الصفحة لا تغني عن المراجعة القانونية والتصريح لدى السلطة الوطنية المختصة من طرف الجهة المشغّلة.</p>
      <Section t="ما الذي نجمعه ولماذا">
        <ul className="list-disc ps-5 space-y-1">
          <li><b>الحساب:</b> البريد الإلكتروني (للدخول)، الاسم الظاهر، الولاية، المهارات، التوفر — لاقتراح النداءات المناسبة.</li>
          <li><b>رقم الهاتف (اختياري):</b> لرسائل الطوارئ إن وافقت عليها فقط.</li>
          <li><b>فصيلة الدم (اختياري، معلومة صحية حساسة):</b> بموافقة صريحة منفصلة، لاقتراح نداءات الدم المتوافقة فقط.</li>
          <li><b>النداءات المرسلة:</b> النص كما كُتب، ورقم الاتصال إن وُجد، لتنسيق المساعدة.</li>
          <li><b>المشاركة والحضور:</b> لاحتساب الساعات المؤكدة وإصدار الشهادات.</li>
          <li><b>صور الأشجار:</b> تُحذف منها بيانات الموقع والتاريخ المضمّنة (EXIF) قبل التخزين.</li>
        </ul>
      </Section>
      <Section t="من يرى ماذا">
        <ul className="list-disc ps-5 space-y-1">
          <li>العموم: النداءات المعتمدة فقط، بموقع تقريبي على مستوى الولاية — دون أرقام هواتف.</li>
          <li>رقم الاتصال لنداء: صاحب النداء، مشرفو ولايته، والمتطوعون الذين انضموا إليه. كل اطلاع من مشرف يُسجَّل.</li>
          <li>هاتفك وفصيلة دمك: أنت فقط. تُستعمل آلياً (دون عرض) لإرسال رسائل الطوارئ أو المطابقة.</li>
          <li>المشرفون والمديريات: نطاق ولايتهم فقط؛ الوزارة: نطاق وطني. الصلاحيات مفروضة في قاعدة البيانات.</li>
        </ul>
      </Section>
      <Section t="الذكاء الاصطناعي">
        <p>عند تفعيله، يُرسل نص النداء إلى مزوّد النموذج (Anthropic Claude، أو Google Gemini في نسخته المجانية) لتحليله وتصنيفه. مع Gemini تُحذف أرقام الهواتف من النص قبل إرساله، لأن Google قد تستعمل محتوى النسخة المجانية لتحسين خدماتها. لا نرسل حسابك أو هاتفك المخزن أو فصيلة دمك. نحتفظ ببصمة (hash) للنص في سجل القرارات وليس النص نفسه. كل قرار آلي يراجعه إنسان قبل النشر.</p>
      </Section>
      <Section t="المدة والحذف">
        <ul className="list-disc ps-5 space-y-1">
          <li>يمكنك تنزيل كل بياناتك من «ملفي ← تنزيل بياناتي».</li>
          <li>طلب الحذف من «ملفي»: يُحذف الحساب والبيانات الشخصية بعد مهلة 14 يوماً للتراجع. تبقى النداءات دون ربطها بك، والإحصاءات المجمّعة دون هوية.</li>
          <li>يمكنك سحب موافقتك على فصيلة الدم أو الرسائل في أي وقت بتعديل ملفك.</li>
        </ul>
      </Section>
      <Section t="الأمن">
        <p>تشفير الاتصال (HTTPS)، صلاحيات على مستوى الصفوف في قاعدة البيانات، تجزئة مفتاحية لأرقام الهواتف عند المقارنة، وسجل تدقيق للإجراءات الحساسة.</p>
      </Section>
    </article>
  );
}

function Section({ t, children }: { t: string; children: React.ReactNode }) {
  return <section><h2 className="text-lg font-black text-slate-900 mb-1">{t}</h2>{children}</section>;
}

function PrivacyFr() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 space-y-5 text-sm leading-relaxed text-slate-700">
      <h1 className="text-3xl font-black text-slate-900">Politique de confidentialité</h1>
      <p className="text-xs text-slate-500">Version {PRIVACY_POLICY_VERSION}. Inspirée de la loi n° 18-07 relative à la protection des personnes physiques dans le traitement des données à caractère personnel. Cette page ne remplace ni l&apos;examen juridique ni la déclaration auprès de l&apos;autorité nationale compétente, à la charge de l&apos;organisme exploitant.</p>
      <Section t="Ce que nous collectons et pourquoi">
        <ul className="list-disc ps-5 space-y-1">
          <li><b>Compte :</b> adresse e-mail (connexion), nom affiché, wilaya, compétences, disponibilités — pour proposer des appels adaptés.</li>
          <li><b>Téléphone (facultatif) :</b> uniquement pour les SMS d&apos;urgence si vous les acceptez.</li>
          <li><b>Groupe sanguin (facultatif, donnée de santé sensible) :</b> avec un consentement explicite séparé, uniquement pour proposer des appels de don compatibles.</li>
          <li><b>Appels envoyés :</b> le texte tel qu&apos;écrit et le numéro de contact éventuel, pour coordonner l&apos;aide.</li>
          <li><b>Participation et présence :</b> pour calculer les heures confirmées et délivrer les attestations.</li>
          <li><b>Photos d&apos;arbres :</b> les métadonnées de position et de date (EXIF) sont supprimées avant stockage.</li>
        </ul>
      </Section>
      <Section t="Qui voit quoi">
        <ul className="list-disc ps-5 space-y-1">
          <li>Public : uniquement les appels approuvés, avec une position approximative au niveau de la wilaya — sans numéro de téléphone.</li>
          <li>Numéro de contact d&apos;un appel : son auteur, les modérateurs de sa wilaya et les bénévoles inscrits. Chaque consultation par un modérateur est journalisée.</li>
          <li>Votre téléphone et votre groupe sanguin : vous seul(e). Ils sont utilisés automatiquement (sans affichage) pour les SMS d&apos;urgence ou la mise en relation.</li>
          <li>Modérateurs et directions de wilaya : leur wilaya uniquement ; le ministère : périmètre national. Ces droits sont appliqués dans la base de données.</li>
        </ul>
      </Section>
      <Section t="Intelligence artificielle">
        <p>Lorsqu&apos;elle est activée, le texte de l&apos;appel est envoyé au fournisseur du modèle (Anthropic Claude, ou Google Gemini dans sa version gratuite) pour analyse. Avec Gemini, les numéros de téléphone sont retirés du texte avant l&apos;envoi, car Google peut utiliser le contenu de la version gratuite pour améliorer ses services. Nous n&apos;envoyons ni votre compte, ni votre téléphone enregistré, ni votre groupe sanguin. Le journal des décisions conserve une empreinte (hash) du texte, pas le texte lui-même. Chaque décision automatique est vérifiée par un humain avant publication.</p>
      </Section>
      <Section t="Durée de conservation et suppression">
        <ul className="list-disc ps-5 space-y-1">
          <li>Vous pouvez télécharger toutes vos données depuis « Mon profil ».</li>
          <li>Demande de suppression depuis « Mon profil » : le compte et les données personnelles sont supprimés après un délai de rétractation de 14 jours. Les appels restent sans lien avec vous ; les statistiques agrégées restent anonymes.</li>
          <li>Vous pouvez retirer à tout moment votre consentement (groupe sanguin, SMS) en modifiant votre profil.</li>
        </ul>
      </Section>
      <Section t="Sécurité">
        <p>Chiffrement des échanges (HTTPS), contrôle d&apos;accès ligne par ligne dans la base de données, hachage à clé des numéros de téléphone lors des comparaisons, et journal d&apos;audit des actions sensibles.</p>
      </Section>
    </article>
  );
}
