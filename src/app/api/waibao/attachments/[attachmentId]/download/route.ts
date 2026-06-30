import { NextResponse } from "next/server";
import { formatApiError } from "@/lib/errors";
import { createAttachmentDownloadUrl } from "@/lib/waibao-attachments";
import { assertWaibaoAuthApi } from "@/lib/waibao-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  const auth = await assertWaibaoAuthApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const { attachmentId } = await params;
    const url = await createAttachmentDownloadUrl(attachmentId);
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : formatApiError(e) },
      { status: 500 }
    );
  }
}
