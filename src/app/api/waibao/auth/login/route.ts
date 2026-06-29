import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatApiError } from "@/lib/errors";
import {
  WAIBAO_SESSION_COOKIE,
  WaibaoAuthError,
  isWaibaoAuthConfigured,
  sessionExpiryDate,
  signWaibaoSession,
  verifyPassword,
  waibaoSessionCookieOptions,
} from "@/lib/waibao-auth";

export async function POST(request: Request) {
  try {
    if (!isWaibaoAuthConfigured()) {
      return NextResponse.json(
        { error: "服务端未配置 WAIBAO_SESSION_SECRET" },
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
      .from("waibao_users")
      .select("id, password_hash, is_active, role, username")
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
      .from("waibao_sessions")
      .insert({ user_id: user.id, expires_at: expiresAt })
      .select("id")
      .single();

    if (sessionError) throw sessionError;

    const token = await signWaibaoSession(user.id, session.id);
    const res = NextResponse.json({
      ok: true,
      username: user.username,
      role: user.role,
    });
    res.cookies.set(WAIBAO_SESSION_COOKIE, token, waibaoSessionCookieOptions());
    return res;
  } catch (e) {
    if (e instanceof WaibaoAuthError) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
