import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatApiError } from "@/lib/errors";

/** 检查 Supabase 连接与表是否已创建 */
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("deliveries").select("id").limit(1);

    if (error) {
      return NextResponse.json({
        ok: false,
        message: formatApiError(error),
      });
    }

    return NextResponse.json({
      ok: true,
      message: "数据库连接正常，可以创建货物条目。",
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      message: formatApiError(e),
    });
  }
}
