import { NextResponse } from "next/server";
import { formatApiError } from "@/lib/errors";
import { assertWaibaoAuthApi } from "@/lib/waibao-auth";

export async function GET() {
  const auth = await assertWaibaoAuthApi();
  if (auth instanceof NextResponse) return auth;

  try {
    return NextResponse.json({
      user: {
        id: auth.user.id,
        username: auth.user.username,
        role: auth.user.role,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
