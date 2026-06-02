import { NextResponse } from "next/server";

const ADMIN_COOKIE = "ktlh_admin";

export async function POST(request: Request) {
  const { password } = (await request.json()) as { password?: string };
  const secret = process.env.ADMIN_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "服务端未配置 ADMIN_SECRET" },
      { status: 500 }
    );
  }

  if (password !== secret) {
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
