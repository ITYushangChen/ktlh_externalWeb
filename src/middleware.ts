import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_COOKIE = "ktlh_admin";

/** 设为 true 且配置 ADMIN_SECRET 后，管理后台才需要密码 */
function isAdminAuthEnabled(): boolean {
  return (
    process.env.ADMIN_REQUIRE_AUTH === "true" &&
    Boolean(process.env.ADMIN_SECRET?.trim())
  );
}

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (!isAdminAuthEnabled()) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  const secret = process.env.ADMIN_SECRET!;
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (token === secret) {
    return NextResponse.next();
  }

  const login = new URL("/admin/login", request.url);
  login.searchParams.set("from", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*"],
};
