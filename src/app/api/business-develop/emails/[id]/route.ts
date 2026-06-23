import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatApiError } from "@/lib/errors";
import { assertBusinessAuthApi } from "@/lib/business-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await assertBusinessAuthApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as { status?: string };
    if (body.status !== "cancelled") {
      return NextResponse.json({ error: "仅支持取消待发送的邮件" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: existing, error: fetchError } = await supabase
      .from("business_prospect_email_schedules")
      .select("status")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;
    if (existing.status !== "pending") {
      return NextResponse.json({ error: "只能取消待发送的邮件" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("business_prospect_email_schedules")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ schedule: data });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
