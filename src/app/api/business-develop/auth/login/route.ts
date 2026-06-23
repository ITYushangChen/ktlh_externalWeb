import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatApiError } from "@/lib/errors";
import {
  BUSINESS_SESSION_COOKIE,
  BusinessAuthError,
  businessSessionCookieOptions,
  isBusinessAuthConfigured,
  sessionExpiryDate,
  signBusinessSession,
  verifyPassword,
} from "@/lib/business-auth";

export async function POST(request: Request) {
  try {
    if (!isBusinessAuthConfigured()) {
      return NextResponse.json(
        { error: "服务端未配置 BUSINESS_SESSION_SECRET" },
        { status: 500 }
      );
    }

    const body = (await request.json()) as { username?: string; password?: string };
    const username = body.username?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!username || !password) {
      return NextResponse.json({ error: "请输入账号和密码" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: user, error } = await supabase
      .from("business_portal_users")
      .select("id, password_hash, is_active")
      .eq("username", username)
      .maybeSingle();

    if (error) throw error;

    if (!user?.is_active) {
      return NextResponse.json({ error: "账号或密码错误" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "账号或密码错误" }, { status: 401 });
    }

    const expiresAt = sessionExpiryDate();
    const { data: session, error: sessionError } = await supabase
      .from("business_portal_sessions")
      .insert({ user_id: user.id, expires_at: expiresAt })
      .select("id")
      .single();

    if (sessionError) throw sessionError;

    const token = await signBusinessSession(user.id, session.id);
    const res = NextResponse.json({ ok: true, username });
    res.cookies.set(BUSINESS_SESSION_COOKIE, token, businessSessionCookieOptions());
    return res;
  } catch (e) {
    if (e instanceof BusinessAuthError) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
