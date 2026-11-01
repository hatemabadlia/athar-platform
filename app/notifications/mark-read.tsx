"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markNotificationsRead } from "@/app/actions/modules";
export function MarkRead() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return <button disabled={pending} onClick={() => start(async () => { await markNotificationsRead(); router.refresh(); })} className="text-xs font-bold text-brand-700 underline">تعليم الكل كمقروء</button>;
}
