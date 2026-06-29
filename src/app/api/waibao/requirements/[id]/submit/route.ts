import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatApiError } from "@/lib/errors";
import { getWaibaoRequirement } from "@/lib/waibao-requirements";
import { assertWaibaoAuthApi } from "@/lib/waibao-auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await assertWaibaoAuthApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const existing = await getWaibaoRequirement(id);
    if (!existing) {
      return NextResponse.json({ error: "需求不存在" }, { status: 404 });
    }
    if (existing.status !== "claimed") {
      return NextResponse.json({ error: "当前状态无法提交完成" }, { status: 400 });
    }
    if (existing.claimed_by !== auth.userId && auth.user.role !== "admin") {
      return NextResponse.json({ error: "只有领取人可提交完成" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("waibao_requirements")
      .update({
        status: "submitted",
        submitted_at: now,
      })
      .eq("id", id)
      .eq("status", "claimed")
      .select("*")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "提交失败，请刷新后重试" }, { status: 409 });
    }

    return NextResponse.json({ requirement: { ...data, price: Number(data.price) } });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
