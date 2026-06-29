"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function WaibaoLogoutButton() {
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/waibao/auth/logout", { method: "POST" });
    router.push("/waibao/login");
    router.refresh();
  };

  return (
    <button type="button" className="btn btn-secondary text-sm" onClick={logout}>
      退出登录
    </button>
  );
}

export function WaibaoShell({
  children,
  username,
  role,
}: {
  children: React.ReactNode;
  username?: string;
  role?: string;
}) {
  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/waibao" className="font-bold text-slate-800 no-underline">
            开拓隆海 · 外包需求
          </Link>
          <div className="flex items-center gap-3">
            {username && (
              <span className="text-sm text-slate-500">
                {username}
                {role === "admin" && (
                  <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    管理员
                  </span>
                )}
              </span>
            )}
            <WaibaoLogoutButton />
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </>
  );
}
