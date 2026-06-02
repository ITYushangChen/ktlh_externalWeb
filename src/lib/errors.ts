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
    return (
      "数据库尚未初始化：请登录 Supabase → SQL Editor，依次执行项目中的 " +
      "supabase/migrations/001_initial.sql 与 002_picker_fields.sql，然后刷新本页重试。"
    );
  }

  if (
    lower.includes("picker_label") ||
    lower.includes("list_sort_order") ||
    (lower.includes("column") && lower.includes("does not exist"))
  ) {
    return (
      "数据库结构过旧：请在 Supabase SQL Editor 执行 " +
      "supabase/migrations/002_picker_fields.sql，或重新执行 001_initial.sql。"
    );
  }

  if (code === "42501" || lower.includes("permission denied") || lower.includes("rls")) {
    return (
      "没有写入权限：请确认 .env.local 中的 SUPABASE_SERVICE_ROLE_KEY 为 " +
      "Supabase 项目 Settings → API 里的 service_role（secret）密钥，修改后重启 npm run dev。"
    );
  }

  if (lower.includes("invalid api key") || lower.includes("jwt")) {
    return "Supabase 密钥无效：请检查 NEXT_PUBLIC_SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY 是否与当前项目一致。";
  }

  if (hint) return `${message}（${hint}）`;
  return message;
}
