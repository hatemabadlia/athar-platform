import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-black text-slate-900">الصفحة غير موجودة</h1>
      <p className="mt-2 text-sm text-slate-600">ربما حُذف هذا العنصر أو أن الرابط غير صحيح.</p>
      <Link href="/" className="mt-4 inline-block rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white">العودة إلى الخريطة</Link>
    </div>
  );
}
