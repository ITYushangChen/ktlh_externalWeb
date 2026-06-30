import { NextResponse } from "next/server";
import { formatApiError } from "@/lib/errors";
import { deleteWaibaoAttachment, getWaibaoAttachment } from "@/lib/waibao-attachments";
import { assertWaibaoAdminApi } from "@/lib/waibao-auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const auth = await assertWaibaoAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id, attachmentId } = await params;
    const attachment = await getWaibaoAttachment(attachmentId);
    if (!attachment || attachment.requirement_id !== id) {
      return NextResponse.json({ error: "附件不存在" }, { status: 404 });
    }

    await deleteWaibaoAttachment(attachmentId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
