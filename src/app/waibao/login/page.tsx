import { Suspense } from "react";
import { WaibaoLoginForm } from "@/components/waibao/WaibaoLoginForm";

export const metadata = {
  title: "登录 · 外包需求",
};

export default function WaibaoLoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Suspense fallback={<p className="text-slate-500">加载中…</p>}>
        <WaibaoLoginForm />
      </Suspense>
    </div>
  );
}
