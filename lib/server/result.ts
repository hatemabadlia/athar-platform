import "server-only";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/** Maps Postgres/PostgREST errors raised by RPCs to safe Arabic messages (no internals leaked). */
export function toActionError(e: unknown): { ok: false; error: string } {
  const err = e as { code?: string; message?: string } | null;
  const code = err?.code ?? "";
  const msg = err?.message ?? "";
  const known: [RegExp | string, string][] = [
    ["42501", "ليست لديك صلاحية لهذا الإجراء."],
    ["28000", "يجب تسجيل الدخول أولاً."],
    [/token expired/, "انتهت صلاحية رمز QR — اطلب من المتطوع تحديثه."],
    [/token already used/, "هذا الرمز استُخدم من قبل."],
    [/invalid token/, "رمز QR غير صالح."],
    [/cannot check yourself in/, "لا يمكنك تسجيل حضورك بنفسك."],
    [/alert not open/, "هذا النداء غير متاح للانضمام."],
    [/you own this alert/, "أنت صاحب هذا النداء."],
    [/transition .* not allowed/, "هذا الانتقال في الحالة غير مسموح."],
    [/set the wilaya/, "حدّد الولاية قبل الاعتماد."],
    [/no confirmed volunteer hours/, "لا توجد ساعات تطوع مؤكدة بعد."],
    [/set your display name/, "أضف اسمك في الملف أولاً."],
    [/already reviewed/, "تمت مراجعته من قبل."],
    [/crisis not active/, "لا توجد حالة طوارئ نشطة."],
    ["23505", "موجود مسبقاً."],
  ];
  for (const [k, v] of known) {
    if (typeof k === "string" ? code === k : k.test(msg)) return { ok: false, error: v };
  }
  console.error("action error", code, msg);
  return { ok: false, error: "حدث خطأ غير متوقع. أعد المحاولة." };
}
