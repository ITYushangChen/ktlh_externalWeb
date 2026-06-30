"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function SupplierLogoutButton() {
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/suppliers/auth/logout", { method: "POST" });
    router.push("/suppliers/login");
    router.refresh();
  };

  return (
    <button type="button" className="btn btn-secondary text-sm" onClick={logout}>
      退出登录
    </button>
  );
}

export function SupplierShell({
  children,
  supplierName,
}: {
  children: React.ReactNode;
  supplierName?: string;
}) {
  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/suppliers" className="font-bold text-slate-800 no-underline">
            开拓隆海 · 供应商送货
          </Link>
          <div className="flex items-center gap-3">
            {supplierName && (
              <span className="text-sm text-slate-500 hidden sm:inline">{supplierName}</span>
            )}
            <SupplierLogoutButton />
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </>
  );
}
