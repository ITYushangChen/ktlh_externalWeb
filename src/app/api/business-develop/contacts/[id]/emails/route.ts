import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatApiError } from "@/lib/errors";
import { assertBusinessAuthApi } from "@/lib/business-auth";
import type { EmailScheduleInput } from "@/types/business-develop";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await assertBusinessAuthApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("business_prospect_email_schedules")
      .select("*")
      .eq("contact_id", id)
      .order("scheduled_at");

    if (error) throw error;
    return NextResponse.json({ schedules: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contactId } = await params;
  const auth = await assertBusinessAuthApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as EmailScheduleInput;

    if (!body.subject?.trim()) {
      return NextResponse.json({ error: "请填写邮件主题" }, { status: 400 });
    }
    if (!body.body?.trim()) {
      return NextResponse.json({ error: "请填写邮件内容" }, { status: 400 });
    }
    if (!body.scheduled_at) {
      return NextResponse.json({ error: "请选择发送时间" }, { status: 400 });
    }

    const scheduledAt = new Date(body.scheduled_at);
    if (Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: "发送时间格式无效" }, { status: 400 });
    }
    if (scheduledAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: "发送时间须晚于当前时间" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: contact, error: contactError } = await supabase
      .from("business_prospect_contacts")
      .select("email, is_active")
      .eq("id", contactId)
      .single();

    if (contactError) throw contactError;
    if (!contact.is_active) {
      return NextResponse.json({ error: "联系人不存在" }, { status: 404 });
    }
    if (!contact.email?.trim()) {
      return NextResponse.json({ error: "该联系人未填写邮箱，无法定时发送" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("business_prospect_email_schedules")
      .insert({
        contact_id: contactId,
        subject: body.subject.trim(),
        body: body.body.trim(),
        scheduled_at: scheduledAt.toISOString(),
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ schedule: data });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
