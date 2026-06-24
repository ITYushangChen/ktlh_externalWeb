import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatApiError } from "@/lib/errors";
import { assertBusinessAuthApi } from "@/lib/business-auth";
import type { ContactLogInput } from "@/types/business-develop";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await assertBusinessAuthApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as Partial<ContactLogInput>;
    const supabase = createAdminClient();
    const patch: Record<string, unknown> = {};

    if (body.subject !== undefined) patch.subject = body.subject.trim();
    if (body.notes !== undefined) patch.notes = body.notes.trim();
    if (body.has_replied !== undefined) patch.has_replied = body.has_replied;
    if (body.contacted_at !== undefined) {
      const parsed = new Date(body.contacted_at);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "联系时间格式无效" }, { status: 400 });
      }
      patch.contacted_at = parsed.toISOString();
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("business_prospect_contact_logs")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ log: data });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await assertBusinessAuthApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("business_prospect_contact_logs")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
