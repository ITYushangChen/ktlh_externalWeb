"use client";

import { useEffect, useState } from "react";

export function DbStatusBanner() {
  const [status, setStatus] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/admin/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() =>
        setStatus({ ok: false, message: "无法连接后台服务，请确认 npm run dev 已启动。" })
      );
  }, []);

  if (!status || status.ok) return null;

  return (
    <div
      className="mb-6 p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 text-sm leading-relaxed"
      role="alert"
    >
      <p className="font-bold mb-1">数据库未就绪</p>
      <p>{status.message}</p>
    </div>
  );
}
