"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function SupplierLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "config") {
      setError("服务端未配置 Supabase，请联系管理员");
    } else if (err === "unbound") {
      setError("账号未绑定供应商档案，请联系采购部开通");
    }
  }, [searchParams]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/suppliers/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "登录失败");
      return;
    }

    const from = searchParams.get("from") ?? "/suppliers";
    router.push(from);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="card p-8 w-full max-w-sm space-y-4">
      <h1 className="text-xl font-bold text-center">供应商送货 · 登录</h1>
      <p className="text-sm text-slate-500 text-center">
        使用采购部分配的邮箱账号登录，查看采购订单并生成送货单
      </p>
      <div>
        <label className="label">邮箱</label>
        <input
          className="input"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>
      <div>
        <label className="label">密码</label>
        <input
          className="input"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "登录中…" : "登录"}
      </button>
    </form>
  );
}
