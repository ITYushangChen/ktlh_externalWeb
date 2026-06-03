function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function isLocalHost(host: string): boolean {
  const h = host.split(":")[0]?.toLowerCase() ?? "";
  return h === "localhost" || h === "127.0.0.1" || h.endsWith(".local");
}

/** 从 Host / X-Forwarded-* 解析当前访问的站点根地址（本地开发返回 null） */
export function getAppBaseUrlFromHost(
  host: string | null,
  proto?: string | null
): string | null {
  const h = host?.split(",")[0]?.trim();
  if (!h || isLocalHost(h)) return null;

  const p =
    proto?.split(",")[0]?.trim().replace(/:$/, "") || "https";
  return normalizeBaseUrl(`${p}://${h}`);
}

/** 环境变量中的公网地址（未配置时回退 VERCEL_URL / localhost） */
export function getAppBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return normalizeBaseUrl(configured);
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return normalizeBaseUrl(`https://${vercel}`);
  }

  return "http://localhost:3999";
}

/**
 * 二维码等对外链接：优先用用户正在访问的域名（如 ktlhweb.xyz），
 * 避免 NEXT_PUBLIC_APP_URL 未 Redeploy 时仍显示旧域名。
 */
export function resolveAppBaseUrl(
  host?: string | null,
  proto?: string | null
): string {
  return getAppBaseUrlFromHost(host ?? null, proto ?? null) ?? getAppBaseUrl();
}

export function getPublicSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "",
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getPublicSupabaseEnv();
  return Boolean(url && anonKey);
}

export function getDeployConfigStatus() {
  const { url, anonKey } = getPublicSupabaseEnv();
  return {
    appUrl: getAppBaseUrl(),
    hasSupabaseUrl: Boolean(url),
    hasAnonKey: Boolean(anonKey),
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    hasAdminSecret: Boolean(process.env.ADMIN_SECRET?.trim()),
    supabaseReady: isSupabaseConfigured(),
  };
}
