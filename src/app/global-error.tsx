"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
        <h1 style={{ color: "#b91c1c" }}>页面出错</h1>
        <p style={{ color: "#475569", lineHeight: 1.6 }}>
          {error.message || "未知错误"}
        </p>
        <p style={{ fontSize: 14, color: "#64748b" }}>
          若刚部署到 Vercel：请到 Settings → Environment Variables 配置 Supabase
          与 ADMIN_SECRET，然后 Redeploy。也可访问 <code>/api/health</code> 自检。
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: 16,
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            background: "#2563eb",
            color: "white",
            cursor: "pointer",
          }}
        >
          重试
        </button>
      </body>
    </html>
  );
}
