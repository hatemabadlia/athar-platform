import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = { title: "تسجيل الدخول" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Suspense fallback={<div className="h-64 rounded-3xl skeleton" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
