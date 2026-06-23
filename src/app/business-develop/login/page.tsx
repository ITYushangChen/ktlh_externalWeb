import { Suspense } from "react";
import { BusinessLoginForm } from "@/components/business-develop/BusinessLoginForm";

export const metadata = {
  title: "登录 · 业务拓展",
};

export default function BusinessLoginPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <Suspense fallback={<p className="text-slate-500">加载中…</p>}>
        <BusinessLoginForm />
      </Suspense>
    </div>
  );
}
