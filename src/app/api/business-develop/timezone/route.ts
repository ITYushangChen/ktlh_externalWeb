import { NextResponse } from "next/server";
import { assertBusinessAuthApi } from "@/lib/business-auth";
import { formatApiError } from "@/lib/errors";
import { resolveTimezoneFromGeocoding } from "@/lib/location-timezone";

const cache = new Map<string, { data: Awaited<ReturnType<typeof resolveTimezoneFromGeocoding>>; expires: number }>();
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const auth = await assertBusinessAuthApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const q = new URL(request.url).searchParams.get("q")?.trim();
    if (!q) {
      return NextResponse.json({ error: "缺少所在地参数" }, { status: 400 });
    }

    const cacheKey = q.toLowerCase();
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return NextResponse.json({ result: cached.data });
    }

    const result = await resolveTimezoneFromGeocoding(q);
    cache.set(cacheKey, { data: result, expires: Date.now() + TTL_MS });

    return NextResponse.json({ result });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
