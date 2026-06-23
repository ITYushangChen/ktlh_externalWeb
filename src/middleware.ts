import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  BUSINESS_SESSION_COOKIE,
  isBusinessAuthConfiguredEdge,
  verifyBusinessSessionEdge,
} from "@/lib/business-auth-edge";

const ADMIN_COOKIE = "ktlh_admin";

function isAdminAuthEnabled(): boolean {
  return (
    process.env.ADMIN_REQUIRE_AUTH === "true" &&
    Boolean(process.env.ADMIN_SECRET?.trim())
  );
}

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

function isBusinessPath(pathname: string): boolean {
  return (
    pathname.startsWith("/business-develop") ||
    pathname.startsWith("/api/business-develop")
  );
}

function isBusinessPublicPath(pathname: string): boolean {
  return (
    pathname === "/business-develop/login" ||
    pathname === "/api/business-develop/auth/login" ||
    pathname === "/api/business-develop/auth/setup"
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isBusinessPath(pathname)) {
    if (isBusinessPublicPath(pathname)) {
      return NextResponse.next();
    }

    if (!isBusinessAuthConfiguredEdge()) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "服务端未配置 BUSINESS_SESSION_SECRET" },
          { status: 503 }
        );
      }
      const login = new URL("/business-develop/login", request.url);
      login.searchParams.set("error", "config");
      return NextResponse.redirect(login);
    }

    const token = request.cookies.get(BUSINESS_SESSION_COOKIE)?.value;
    const valid = await verifyBusinessSessionEdge(token);
    if (!valid) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });
      }
      const login = new URL("/business-develop/login", request.url);
      login.searchParams.set("from", pathname);
      return NextResponse.redirect(login);
    }

    return NextResponse.next();
  }

  if (!isAdminPath(pathname)) {
    return NextResponse.next();
  }

  if (!isAdminAuthEnabled()) {
    return NextResponse.next();
  }

  if (pathname === "/admin/login") {
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
