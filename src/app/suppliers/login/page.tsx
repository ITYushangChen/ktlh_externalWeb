import { Suspense } from "react";
import { SupplierLoginForm } from "@/components/suppliers/SupplierLoginForm";

export const metadata = {
  title: "供应商登录 · 开拓隆海",
};

export default function SupplierLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[var(--bg)]">
      <Suspense>
        <SupplierLoginForm />
      </Suspense>
    </div>
  );
}
