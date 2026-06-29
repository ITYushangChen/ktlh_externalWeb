import { NextResponse } from "next/server";
import { WAIBAO_SESSION_COOKIE, waibaoSessionCookieOptions } from "@/lib/waibao-auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(WAIBAO_SESSION_COOKIE, "", { ...waibaoSessionCookieOptions(0), maxAge: 0 });
  return res;
}
