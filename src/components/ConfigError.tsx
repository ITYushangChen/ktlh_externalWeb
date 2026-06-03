import Link from "next/link";
import { getDeployConfigStatus } from "@/lib/env";

export function ConfigError({ context }: { context?: string }) {
  const status = getDeployConfigStatus();

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card p-8 max-w-lg text-sm leading-relaxed space-y-4">
        <h1 className="text-xl font-bold text-red-700">站点配置未完成</h1>
        {context && <p className="text-slate-600">{context}</p>}
        <p>页面无法加载，通常是 <strong>环境变量未配置</strong> 或 <strong>未执行数据库脚本 003_simplified.sql</strong>。</p>
        <ul className="list-disc pl-5 space-y-1 text-slate-700">
          {!status.hasSupabaseUrl && (
            <li>缺少 <code>NEXT_PUBLIC_SUPABASE_URL</code></li>
          )}
          {!status.hasAnonKey && (
            <li>缺少 <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
          )}
          {!status.hasServiceRole && (
            <li>缺少 <code>SUPABASE_SERVICE_ROLE_KEY</code>（管理后台保存需要）</li>
          )}
          {!status.hasAdminSecret && (
            <li>缺少 <code>ADMIN_SECRET</code>（管理后台登录需要）</li>
          )}
        </ul>
        <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
          <p>
            <strong>操作：</strong>Vercel → Project → Settings → Environment Variables
          </p>
          <p>填好后点 Deployments → 最新部署 → <strong>Redeploy</strong></p>
          <p>
            建议设置 <code>NEXT_PUBLIC_APP_URL</code> ={" "}
            <span className="break-all">{status.appUrl}</span>
          </p>
        </div>
        <Link href="/api/health" className="text-blue-600 font-semibold">
          查看配置诊断 JSON →
        </Link>
      </div>
    </main>
  );
}
