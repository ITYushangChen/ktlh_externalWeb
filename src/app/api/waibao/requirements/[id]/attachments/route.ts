import { NextResponse } from "next/server";
import { formatApiError } from "@/lib/errors";
import { getWaibaoRequirement } from "@/lib/waibao-requirements";
import { uploadWaibaoAttachment } from "@/lib/waibao-attachments";
import { assertWaibaoAdminApi } from "@/lib/waibao-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await assertWaibaoAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const existing = await getWaibaoRequirement(id);
    if (!existing) {
      return NextResponse.json({ error: "需求不存在" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请选择要上传的文件" }, { status: 400 });
    }

    const attachment = await uploadWaibaoAttachment(id, file, auth.userId);
    return NextResponse.json({ attachment });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : formatApiError(e) },
      { status: 500 }
    );
  }
}
