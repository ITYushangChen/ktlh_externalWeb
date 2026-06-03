import { NextResponse } from "next/server";
import { getDeployConfigStatus } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatApiError } from "@/lib/errors";

/** 公网可访问的配置自检（不返回任何密钥） */
export async function GET() {
  const config = getDeployConfigStatus();

  let database: { ok: boolean; message: string } = {
    ok: false,
    message: "未检查",
  };

  if (config.supabaseReady && config.hasServiceRole) {
    try {
      const supabase = createAdminClient();
      const { error } = await supabase.from("delivery_types").select("id").limit(1);
      database = error
        ? { ok: false, message: formatApiError(error) }
        : { ok: true, message: "数据库连接正常" };
    } catch (e) {
      database = { ok: false, message: formatApiError(e) };
    }
  } else if (!config.supabaseReady) {
    database = { ok: false, message: "Supabase 公钥环境变量未配置" };
  } else {
    database = { ok: false, message: "缺少 SUPABASE_SERVICE_ROLE_KEY" };
  }

  const ready =
    config.supabaseReady &&
    config.hasServiceRole &&
    config.hasAdminSecret &&
    database.ok;

  return NextResponse.json({
    ready,
    config,
    database,
    pages: {
      home: "/",
      admin: "/admin",
    },
  });
}
