import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatApiError } from "@/lib/errors";
import type { DeliveryTypeInput } from "@/types/site";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = (await request.json()) as Partial<DeliveryTypeInput> & {
      is_active?: boolean;
    };
    const supabase = createAdminClient();

    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name.trim();
    if (body.contact_name !== undefined) patch.contact_name = body.contact_name.trim();
    if (body.phone !== undefined) patch.phone = body.phone.trim();
    if (body.sort_order !== undefined) patch.sort_order = body.sort_order;
    if (body.is_active !== undefined) patch.is_active = body.is_active;

    const { data, error } = await supabase
      .from("delivery_types")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ type: data });
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
    const { error } = await supabase
      .from("delivery_types")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
