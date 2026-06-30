import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  BUSINESS_SESSION_COOKIE,
  isBusinessAuthConfiguredEdge,
  verifyBusinessSessionEdge,
} from "@/lib/business-auth-edge";
import {
  WAIBAO_SESSION_COOKIE,
  isWaibaoAuthConfiguredEdge,
  verifyWaibaoSessionEdge,
} from "@/lib/waibao-auth-edge";
import { getPublicSupabaseEnv } from "@/lib/env";

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

function isWaibaoPath(pathname: string): boolean {
  return pathname.startsWith("/waibao") || pathname.startsWith("/api/waibao");
}

function isWaibaoPublicPath(pathname: string): boolean {
  return (
    pathname === "/waibao/login" ||
    pathname === "/api/waibao/auth/login" ||
    pathname === "/api/waibao/auth/setup"
  );
}

function isSupplierPath(pathname: string): boolean {
  return pathname.startsWith("/suppliers") || pathname.startsWith("/api/suppliers");
}

function isSupplierPublicPath(pathname: string): boolean {
  return (
    pathname === "/suppliers/login" ||
    pathname === "/api/suppliers/auth/login"
  );
}

async function handleSupplierAuth(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  if (!isSupplierPath(pathname)) return null;

  const { url, anonKey } = getPublicSupabaseEnv();
  if (!url || !anonKey) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "服务端未配置 Supabase" }, { status: 503 });
    }
    const login = new URL("/suppliers/login", request.url);
    login.searchParams.set("error", "config");
    return NextResponse.redirect(login);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isSupplierPublicPath(pathname)) {
    if (user && pathname === "/suppliers/login") {
      return NextResponse.redirect(new URL("/suppliers", request.url));
    }
    return response;
  }

  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });
    }
    const login = new URL("/suppliers/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const supplierResponse = await handleSupplierAuth(request);
  if (supplierResponse) return supplierResponse;

  if (isWaibaoPath(pathname)) {
    if (isWaibaoPublicPath(pathname)) {
      return NextResponse.next();
    }

    if (!isWaibaoAuthConfiguredEdge()) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "服务端未配置 WAIBAO_SESSION_SECRET" },
          { status: 503 }
        );
      }
      const login = new URL("/waibao/login", request.url);
      login.searchParams.set("error", "config");
      return NextResponse.redirect(login);
    }

    const token = request.cookies.get(WAIBAO_SESSION_COOKIE)?.value;
    const valid = await verifyWaibaoSessionEdge(token);
    if (!valid) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });
      }
      const login = new URL("/waibao/login", request.url);
      login.searchParams.set("from", pathname);
      return NextResponse.redirect(login);
    }

    return NextResponse.next();
  }

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
    "/waibao",
    "/waibao/:path*",
    "/api/waibao/:path*",
    "/suppliers",
    "/suppliers/:path*",
    "/api/suppliers/:path*",
  ],
};
