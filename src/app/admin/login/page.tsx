import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Suspense fallback={<div className="card p-8">加载中…</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
