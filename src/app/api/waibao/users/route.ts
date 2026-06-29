import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatApiError } from "@/lib/errors";
import { assertWaibaoAdminApi, hashPassword, isWaibaoRole } from "@/lib/waibao-auth";

export async function GET() {
  const auth = await assertWaibaoAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("waibao_users")
      .select("id, username, role, is_active, created_at")
      .order("created_at");

    if (error) throw error;
    return NextResponse.json({ users: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await assertWaibaoAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
      role?: string;
    };

    const username = body.username?.trim().toLowerCase();
    const password = body.password ?? "";
    const role = body.role?.trim() ?? "user";

    if (!username || username.length < 3) {
      return NextResponse.json({ error: "账号至少 3 个字符" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "密码至少 8 位" }, { status: 400 });
    }
    if (!isWaibaoRole(role)) {
      return NextResponse.json({ error: "无效的角色" }, { status: 400 });
    }
    if (role === "admin" && auth.user.role !== "admin") {
      return NextResponse.json({ error: "无法创建管理员账号" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const passwordHash = await hashPassword(password);
    const { data, error } = await supabase
      .from("waibao_users")
      .insert({
        username,
        password_hash: passwordHash,
        role,
        is_active: true,
      })
      .select("id, username, role, is_active, created_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ user: data });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
