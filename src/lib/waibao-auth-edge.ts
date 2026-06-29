import { jwtVerify } from "jose";

export const WAIBAO_SESSION_COOKIE = "ktlh_waibao_session";

export async function verifyWaibaoSessionEdge(
  token: string | undefined
): Promise<boolean> {
  if (!token) return false;

  const secret = process.env.WAIBAO_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) return false;

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export function isWaibaoAuthConfiguredEdge(): boolean {
  const secret = process.env.WAIBAO_SESSION_SECRET?.trim();
  return Boolean(secret && secret.length >= 32);
}
