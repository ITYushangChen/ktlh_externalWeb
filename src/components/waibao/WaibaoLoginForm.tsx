"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function WaibaoLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [setupSecret, setSetupSecret] = useState("");

  useEffect(() => {
    if (searchParams.get("error") === "config") {
      setError("服务端未配置 WAIBAO_SESSION_SECRET，请联系管理员");
      return;
    }
    fetch("/api/waibao/auth/setup")
      .then((r) => r.json())
      .then((json) => {
        if (json.needsSetup) setNeedsSetup(true);
      })
      .catch(() => {});
  }, [searchParams]);

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/waibao/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    setLoading(false);
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "登录失败");
      return;
    }

    const from = searchParams.get("from") ?? "/waibao";
    router.push(from);
    router.refresh();
  };

  const submitSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/waibao/auth/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, setupSecret }),
    });

    setLoading(false);
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "初始化失败");
      return;
    }

    setSetupMode(false);
    setNeedsSetup(false);
    setError(null);
    alert("管理员账号已创建，请登录");
  };

  if (setupMode || needsSetup) {
    return (
      <form onSubmit={submitSetup} className="card p-8 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold text-center">初始化管理员</h1>
        <p className="text-sm text-slate-500 text-center">
          首次使用需创建管理员账号，之后只有管理员可以创建其他账号
        </p>
        <div>
          <label className="label">初始化密钥</label>
          <input
            className="input"
            type="password"
            required
            value={setupSecret}
            onChange={(e) => setSetupSecret(e.target.value)}
            placeholder="WAIBAO_SETUP_SECRET"
          />
        </div>
        <div>
          <label className="label">管理员账号</label>
          <input
            className="input"
            required
            minLength={3}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div>
          <label className="label">密码（至少 8 位）</label>
          <input
            className="input"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? "创建中…" : "创建管理员"}
        </button>
        {!needsSetup && (
          <button
            type="button"
            className="btn btn-secondary w-full"
            onClick={() => setSetupMode(false)}
          >
            返回登录
          </button>
        )}
      </form>
    );
  }

  return (
    <form onSubmit={submitLogin} className="card p-8 w-full max-w-sm space-y-4">
      <h1 className="text-xl font-bold text-center">外包需求 · 登录</h1>
      <div>
        <label className="label">账号</label>
        <input
          className="input"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
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
      <button
        type="button"
        className="btn btn-secondary w-full text-sm"
        onClick={() => setSetupMode(true)}
      >
        首次初始化管理员
      </button>
    </form>
  );
}
