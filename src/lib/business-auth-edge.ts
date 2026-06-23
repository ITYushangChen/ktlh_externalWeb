import { jwtVerify } from "jose";

export const BUSINESS_SESSION_COOKIE = "ktlh_business_session";

/** Edge/Middleware 用：仅校验 JWT 签名与过期时间 */
export async function verifyBusinessSessionEdge(
  token: string | undefined
): Promise<boolean> {
  if (!token) return false;

  const secret = process.env.BUSINESS_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) return false;

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export function isBusinessAuthConfiguredEdge(): boolean {
  const secret = process.env.BUSINESS_SESSION_SECRET?.trim();
  return Boolean(secret && secret.length >= 32);
}
