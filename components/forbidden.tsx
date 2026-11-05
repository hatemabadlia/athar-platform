import Link from "next/link";
import { Lock } from "lucide-react";

export function Forbidden({ signedIn, what }: { signedIn: boolean; what: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <Lock className="mx-auto h-10 w-10 text-slate-400" aria-hidden />
      <h1 className="mt-3 text-xl font-black text-slate-900">{what} — للمشرفين فقط</h1>
      <p className="mt-1 text-sm text-slate-600">{signedIn ? "حسابك لا يملك دور مشرف. تُمنح الأدوار من مديرية الشباب والرياضة للولاية أو الوزارة." : "سجّل الدخول بحساب مشرف."}</p>
      {!signedIn && <Link href="/login" className="mt-4 inline-block rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white">دخول</Link>}
    </div>
  );
}
