/** 生产环境公网地址（二维码、链接用） */
export function getAppBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  // Vercel 自动注入，无需手动填也能先访问（建议仍配置 NEXT_PUBLIC_APP_URL 后 Redeploy）
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/$/, "")}`;
  }

  return "http://localhost:3999";
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
