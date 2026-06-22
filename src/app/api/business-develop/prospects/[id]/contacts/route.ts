import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatApiError } from "@/lib/errors";
import type { ContactInput } from "@/types/business-develop";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("business_prospect_contacts")
      .select("*, email_schedules:business_prospect_email_schedules(*)")
      .eq("prospect_id", id)
      .eq("is_active", true)
      .order("sort_order");

    if (error) throw error;
    return NextResponse.json({ contacts: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: prospectId } = await params;
  try {
    const body = (await request.json()) as ContactInput;

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "请填写联系人姓名" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { count } = await supabase
      .from("business_prospect_contacts")
      .select("*", { count: "exact", head: true })
      .eq("prospect_id", prospectId)
      .eq("is_active", true);

    const { data, error } = await supabase
      .from("business_prospect_contacts")
      .insert({
        prospect_id: prospectId,
        name: body.name.trim(),
        phone: body.phone?.trim() ?? "",
        email: body.email?.trim() ?? "",
        sort_order: body.sort_order ?? (count ?? 0),
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ contact: data });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
