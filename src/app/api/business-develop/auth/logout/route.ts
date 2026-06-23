import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatApiError } from "@/lib/errors";
import {
  BUSINESS_SESSION_COOKIE,
  businessSessionCookieOptions,
  verifyBusinessSessionToken,
} from "@/lib/business-auth";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(BUSINESS_SESSION_COOKIE)?.value;

    if (token) {
      const payload = await verifyBusinessSessionToken(token);
      if (payload) {
        const supabase = createAdminClient();
        await supabase
          .from("business_portal_sessions")
          .delete()
          .eq("id", payload.sessionId)
          .eq("user_id", payload.userId);
      }
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(BUSINESS_SESSION_COOKIE, "", {
      ...businessSessionCookieOptions(0),
      maxAge: 0,
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
