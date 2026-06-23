import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const BUSINESS_SESSION_COOKIE = "ktlh_business_session";
const BCRYPT_ROUNDS = 12;
const SESSION_DAYS = 7;

export class BusinessAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessAuthError";
  }
}

function getSessionSecret(): Uint8Array {
  const secret = process.env.BUSINESS_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new BusinessAuthError(
      "服务端未配置 BUSINESS_SESSION_SECRET（至少 32 位随机字符串）"
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

export async function signBusinessSession(userId: string, sessionId: string): Promise<string> {
  const secret = getSessionSecret();
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret);
}

export async function verifyBusinessSessionToken(
  token: string
): Promise<{ userId: string; sessionId: string } | null> {
  try {
    const secret = getSessionSecret();
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.sub;
    const sessionId = payload.sid;
    if (!userId || typeof sessionId !== "string") return null;
    return { userId, sessionId };
  } catch {
    return null;
  }
}

export function sessionExpiryDate(): string {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export function businessSessionCookieOptions(maxAge = SESSION_DAYS * 24 * 60 * 60) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}

export async function requireBusinessAuth(): Promise<{ userId: string; sessionId: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(BUSINESS_SESSION_COOKIE)?.value;
  if (!token) {
    throw new BusinessAuthError("未登录，请先登录");
  }

  const payload = await verifyBusinessSessionToken(token);
  if (!payload) {
    throw new BusinessAuthError("登录已过期，请重新登录");
  }

  const supabase = createAdminClient();
  const { data: session, error } = await supabase
    .from("business_portal_sessions")
    .select("id, user_id, expires_at")
    .eq("id", payload.sessionId)
    .eq("user_id", payload.userId)
    .maybeSingle();

  if (error) throw error;
  if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
    throw new BusinessAuthError("登录已失效，请重新登录");
  }

  return { userId: payload.userId, sessionId: payload.sessionId };
}

export function isBusinessAuthConfigured(): boolean {
  const secret = process.env.BUSINESS_SESSION_SECRET?.trim();
  return Boolean(secret && secret.length >= 32);
}

export async function assertBusinessAuthApi(): Promise<
  { userId: string; sessionId: string } | NextResponse
> {
  try {
    return await requireBusinessAuth();
  } catch (e) {
    if (e instanceof BusinessAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }
}
