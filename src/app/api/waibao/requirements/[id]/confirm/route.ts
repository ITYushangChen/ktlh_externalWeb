import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatApiError } from "@/lib/errors";
import { getWaibaoRequirement } from "@/lib/waibao-requirements";
import { assertWaibaoAdminApi } from "@/lib/waibao-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await assertWaibaoAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = (await request.json()) as { admin_note?: string };
    const existing = await getWaibaoRequirement(id);
    if (!existing) {
      return NextResponse.json({ error: "需求不存在" }, { status: 404 });
    }
    if (existing.status !== "submitted") {
      return NextResponse.json({ error: "只有待确认的需求可以验收" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("waibao_requirements")
      .update({
        status: "completed",
        completed_at: now,
        admin_note: body.admin_note?.trim() ?? existing.admin_note,
      })
      .eq("id", id)
      .eq("status", "submitted")
      .select("*")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "确认失败，请刷新后重试" }, { status: 409 });
    }

    return NextResponse.json({ requirement: { ...data, price: Number(data.price) } });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
