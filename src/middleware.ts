import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_COOKIE = "ktlh_admin";

/** 设为 true 且配置 ADMIN_SECRET 后，受保护路由才需要密码 */
function isAdminAuthEnabled(): boolean {
  return (
    process.env.ADMIN_REQUIRE_AUTH === "true" &&
    Boolean(process.env.ADMIN_SECRET?.trim())
  );
}

function isProtectedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/business-develop") ||
    pathname.startsWith("/api/business-develop")
  );
}

function isLoginPath(pathname: string): boolean {
  return pathname === "/admin/login";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (!isAdminAuthEnabled()) {
    return NextResponse.next();
  }

  if (isLoginPath(pathname)) {
    return NextResponse.next();
  }

  const secret = process.env.ADMIN_SECRET!;
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (token === secret) {
    return NextResponse.next();
  }

  const login = new URL("/admin/login", request.url);
  login.searchParams.set("from", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/business-develop",
    "/business-develop/:path*",
    "/api/business-develop/:path*",
  ],
};
