import type { PostgrestError } from "@supabase/supabase-js";

export function isPostgrestError(e: unknown): e is PostgrestError {
  return (
    typeof e === "object" &&
    e !== null &&
    "message" in e &&
    typeof (e as PostgrestError).message === "string"
  );
}

export function formatApiError(e: unknown): string {
  if (isPostgrestError(e)) {
    return formatPostgrestMessage(e.message, e.code, e.hint);
  }

  if (e instanceof Error) {
    return formatPostgrestMessage(e.message);
  }

  if (typeof e === "object" && e !== null && "message" in e) {
    return formatPostgrestMessage(String((e as { message: string }).message));
  }

  return "操作失败，请稍后重试";
}

function formatPostgrestMessage(
  message: string,
  code?: string,
  hint?: string | null
): string {
  const lower = message.toLowerCase();

  if (
    code === "PGRST205" ||
    lower.includes("could not find the table") ||
    lower.includes("schema cache")
  ) {
    if (lower.includes("business_prospect_contacts") || lower.includes("business_prospect_email")) {
      return (
        "数据库尚未升级：请在 Supabase SQL Editor 执行 " +
        "supabase/migrations/005_prospect_contacts_emails.sql，然后刷新页面。"
      );
    }
    if (lower.includes("business_prospects")) {
      return (
        "数据库尚未升级：请在 Supabase SQL Editor 执行 " +
        "supabase/migrations/004_business_prospects.sql，然后刷新页面。"
      );
    }
    if (lower.includes("delivery_types") || lower.includes("site_settings")) {
      return (
        "数据库尚未升级：请在 Supabase SQL Editor 执行 " +
        "supabase/migrations/003_simplified.sql，然后刷新页面。"
      );
    }
    return (
      "数据库尚未初始化：请在 Supabase SQL Editor 执行 " +
      "supabase/migrations/003_simplified.sql。"
    );
  }

  if (code === "42501" || lower.includes("permission denied") || lower.includes("rls")) {
    return (
      "没有写入权限：请确认 SUPABASE_SERVICE_ROLE_KEY 为 service_role 密钥，修改后 Redeploy。"
    );
  }

  if (lower.includes("invalid api key") || lower.includes("jwt")) {
    return "Supabase 密钥无效，请检查环境变量是否与当前项目一致。";
  }

  if (hint) return `${message}（${hint}）`;
  return message;
}
