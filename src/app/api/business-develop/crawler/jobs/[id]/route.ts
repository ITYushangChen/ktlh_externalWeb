import { NextResponse } from "next/server";
import { assertBusinessAuthApi } from "@/lib/business-auth";
import { formatApiError } from "@/lib/errors";
import { getCrawlJob } from "@/lib/lead-crawler/run-job";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await assertBusinessAuthApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const data = await getCrawlJob(id);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
