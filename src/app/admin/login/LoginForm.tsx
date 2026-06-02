"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "登录失败");
      return;
    }

    const from = searchParams.get("from") ?? "/admin";
    router.push(from);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="card p-8 w-full max-w-sm space-y-4">
      <h1 className="text-xl font-bold text-center">管理后台登录</h1>
      <div>
        <label className="label">管理密码</label>
        <input
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "验证中…" : "登录"}
      </button>
    </form>
  );
}
