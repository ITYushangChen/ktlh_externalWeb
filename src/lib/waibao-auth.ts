import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WaibaoUser, WaibaoUserRole } from "@/types/waibao";

export const WAIBAO_SESSION_COOKIE = "ktlh_waibao_session";
const BCRYPT_ROUNDS = 12;
const SESSION_DAYS = 7;

export class WaibaoAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WaibaoAuthError";
  }
}

function getSessionSecret(): Uint8Array {
  const secret = process.env.WAIBAO_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new WaibaoAuthError(
      "服务端未配置 WAIBAO_SESSION_SECRET（至少 32 位随机字符串）"
    );
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signWaibaoSession(userId: string, sessionId: string): Promise<string> {
  const secret = getSessionSecret();
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret);
}

export async function verifyWaibaoSessionToken(
  token: string
): Promise<{ userId: string; sessionId: string } | null> {
  try {
    const secret = getSessionSecret();
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.sub;
    const sessionId = payload.sid;
    if (!userId || typeof sessionId !== "string") return null;
    return { userId, sessionId: sessionId };
  } catch {
    return null;
  }
}

export function sessionExpiryDate(): string {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export function waibaoSessionCookieOptions(maxAge = SESSION_DAYS * 24 * 60 * 60) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}

export function isWaibaoAuthConfigured(): boolean {
  const secret = process.env.WAIBAO_SESSION_SECRET?.trim();
  return Boolean(secret && secret.length >= 32);
}

export async function getWaibaoUser(userId: string): Promise<WaibaoUser | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("waibao_users")
    .select("id, username, role, is_active, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.is_active) return null;
  return data as WaibaoUser;
}

export async function requireWaibaoAuth(): Promise<{
  userId: string;
  sessionId: string;
  user: WaibaoUser;
}> {
  const cookieStore = await cookies();
  const token = cookieStore.get(WAIBAO_SESSION_COOKIE)?.value;
  if (!token) {
    throw new WaibaoAuthError("未登录，请先登录");
  }

  const payload = await verifyWaibaoSessionToken(token);
  if (!payload) {
    throw new WaibaoAuthError("登录已过期，请重新登录");
  }

  const supabase = createAdminClient();
  const { data: session, error } = await supabase
    .from("waibao_sessions")
    .select("id, user_id, expires_at")
    .eq("id", payload.sessionId)
    .eq("user_id", payload.userId)
    .maybeSingle();

  if (error) throw error;
  if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
    throw new WaibaoAuthError("登录已失效，请重新登录");
  }

  const user = await getWaibaoUser(payload.userId);
  if (!user) {
    throw new WaibaoAuthError("账号不可用，请联系管理员");
  }

  return { userId: payload.userId, sessionId: payload.sessionId, user };
}

export async function requireWaibaoAdmin(): Promise<{
  userId: string;
  sessionId: string;
  user: WaibaoUser;
}> {
  const auth = await requireWaibaoAuth();
  if (auth.user.role !== "admin") {
    throw new WaibaoAuthError("需要管理员权限");
  }
  return auth;
}

export async function assertWaibaoAuthApi(): Promise<
  { userId: string; sessionId: string; user: WaibaoUser } | NextResponse
> {
  try {
    return await requireWaibaoAuth();
  } catch (e) {
    if (e instanceof WaibaoAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }
}

export async function assertWaibaoAdminApi(): Promise<
  { userId: string; sessionId: string; user: WaibaoUser } | NextResponse
> {
  try {
    return await requireWaibaoAdmin();
  } catch (e) {
    if (e instanceof WaibaoAuthError) {
      const status = e.message.includes("管理员") ? 403 : 401;
      return NextResponse.json({ error: e.message }, { status });
    }
    throw e;
  }
}

export function isWaibaoRole(role: string): role is WaibaoUserRole {
  return role === "admin" || role === "user";
}
