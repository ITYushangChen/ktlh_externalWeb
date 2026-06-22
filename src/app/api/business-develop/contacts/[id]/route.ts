import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatApiError } from "@/lib/errors";
import type { ContactInput } from "@/types/business-develop";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = (await request.json()) as Partial<ContactInput> & { is_active?: boolean };
    const supabase = createAdminClient();
    const patch: Record<string, unknown> = {};

    if (body.name !== undefined) patch.name = body.name.trim();
    if (body.phone !== undefined) patch.phone = body.phone.trim();
    if (body.email !== undefined) patch.email = body.email.trim();
    if (body.sort_order !== undefined) patch.sort_order = body.sort_order;
    if (body.is_active !== undefined) patch.is_active = body.is_active;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("business_prospect_contacts")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ contact: data });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = createAdminClient();

    const { data: pending } = await supabase
      .from("business_prospect_email_schedules")
      .select("id")
      .eq("contact_id", id)
      .eq("status", "pending");

    if (pending && pending.length > 0) {
      await supabase
        .from("business_prospect_email_schedules")
        .update({ status: "cancelled" })
        .eq("contact_id", id)
        .eq("status", "pending");
    }

    const { error } = await supabase
      .from("business_prospect_contacts")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
