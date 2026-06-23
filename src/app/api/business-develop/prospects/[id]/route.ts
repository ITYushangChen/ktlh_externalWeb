import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatApiError } from "@/lib/errors";
import { assertBusinessAuthApi } from "@/lib/business-auth";
import {
  PROSPECT_STAGES,
  type ProspectInput,
  type ProspectMoveInput,
} from "@/types/business-develop";

const VALID_STAGES = new Set(PROSPECT_STAGES.map((s) => s.id));

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await assertBusinessAuthApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as Partial<ProspectInput> &
      Partial<ProspectMoveInput> & { is_active?: boolean };

    if (body.stage !== undefined && !VALID_STAGES.has(body.stage)) {
      return NextResponse.json({ error: "无效的开发状态" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const patch: Record<string, unknown> = {};

    if (body.company_name !== undefined) patch.company_name = body.company_name.trim();
    if (body.website !== undefined) patch.website = body.website.trim();
    if (body.annual_demand !== undefined) patch.annual_demand = body.annual_demand.trim();
    if (body.location !== undefined) patch.location = body.location.trim();
    if (body.stage !== undefined) patch.stage = body.stage;
    if (body.notes !== undefined) patch.notes = body.notes.trim();
    if (body.sort_order !== undefined) patch.sort_order = body.sort_order;
    if (body.is_active !== undefined) patch.is_active = body.is_active;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("business_prospects")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ prospect: data });
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
      .from("business_prospects")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
