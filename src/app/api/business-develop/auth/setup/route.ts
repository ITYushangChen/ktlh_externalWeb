import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatApiError } from "@/lib/errors";
import {
  BusinessAuthError,
  hashPassword,
  isBusinessAuthConfigured,
} from "@/lib/business-auth";

/** 首次初始化账号（仅当数据库中尚无用户时可用） */
export async function POST(request: Request) {
  try {
    if (!isBusinessAuthConfigured()) {
      return NextResponse.json(
        { error: "服务端未配置 BUSINESS_SESSION_SECRET" },
        { status: 500 }
      );
    }

    const setupSecret = process.env.BUSINESS_SETUP_SECRET?.trim();
    if (!setupSecret) {
      return NextResponse.json(
        { error: "服务端未配置 BUSINESS_SETUP_SECRET" },
        { status: 500 }
      );
    }

    const body = (await request.json()) as {
      username?: string;
      password?: string;
      setupSecret?: string;
    };

    if (body.setupSecret !== setupSecret) {
      return NextResponse.json({ error: "初始化密钥错误" }, { status: 403 });
    }

    const username = body.username?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!username || username.length < 3) {
      return NextResponse.json({ error: "账号至少 3 个字符" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "密码至少 8 位" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { count, error: countError } = await supabase
      .from("business_portal_users")
      .select("*", { count: "exact", head: true });

    if (countError) throw countError;
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: "账号已初始化，无法重复创建" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const { error: insertError } = await supabase.from("business_portal_users").insert({
      username,
      password_hash: passwordHash,
      is_active: true,
    });

    if (insertError) throw insertError;
    return NextResponse.json({ ok: true, username });
  } catch (e) {
    if (e instanceof BusinessAuthError) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("business_portal_users")
      .select("*", { count: "exact", head: true });

    if (error) throw error;
    return NextResponse.json({ needsSetup: (count ?? 0) === 0 });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
