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
    if (existing.status !== "open") {
      return NextResponse.json({ error: "该需求已被领取或已关闭" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("waibao_requirements")
      .update({
        status: "claimed",
        claimed_by: auth.userId,
        claimed_at: now,
      })
      .eq("id", id)
      .eq("status", "open")
      .select("*")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "领取失败，可能已被他人领取" }, { status: 409 });
    }

    return NextResponse.json({ requirement: { ...data, price: Number(data.price) } });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
