import { NextResponse } from "next/server";
import { assertBusinessAuthApi } from "@/lib/business-auth";
import { formatApiError } from "@/lib/errors";
import { processCrawlBatch } from "@/lib/lead-crawler/run-job";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await assertBusinessAuthApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const result = await processCrawlBatch(id, 1);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
