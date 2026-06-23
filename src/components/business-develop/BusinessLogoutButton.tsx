"use client";

import { useRouter } from "next/navigation";

export function BusinessLogoutButton() {
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/business-develop/auth/logout", { method: "POST" });
    router.push("/business-develop/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={logout}
      className="text-sm text-slate-600 font-semibold hover:text-slate-900"
    >
      退出登录
    </button>
  );
}
