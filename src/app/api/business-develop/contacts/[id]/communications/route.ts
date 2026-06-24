import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatApiError } from "@/lib/errors";
import { assertBusinessAuthApi } from "@/lib/business-auth";
import type { ContactLogInput } from "@/types/business-develop";

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
      .from("business_prospect_contact_logs")
      .select("*")
      .eq("contact_id", id)
      .order("contacted_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ logs: data ?? [] });
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
    const body = (await request.json()) as ContactLogInput;

    if (!body.subject?.trim()) {
      return NextResponse.json({ error: "请填写联络事项" }, { status: 400 });
    }

    let contactedAt = new Date().toISOString();
    if (body.contacted_at) {
      const parsed = new Date(body.contacted_at);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "联系时间格式无效" }, { status: 400 });
      }
      contactedAt = parsed.toISOString();
    }

    const supabase = createAdminClient();

    const { data: contact, error: contactError } = await supabase
      .from("business_prospect_contacts")
      .select("id, is_active")
      .eq("id", contactId)
      .maybeSingle();

    if (contactError) throw contactError;
    if (!contact?.is_active) {
      return NextResponse.json({ error: "联系人不存在" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("business_prospect_contact_logs")
      .insert({
        contact_id: contactId,
        subject: body.subject.trim(),
        notes: body.notes?.trim() ?? "",
        contacted_at: contactedAt,
        has_replied: body.has_replied ?? false,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ log: data });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
