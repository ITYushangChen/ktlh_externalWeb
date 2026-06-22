import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatApiError } from "@/lib/errors";
import { PROSPECT_STAGES, type ProspectInput } from "@/types/business-develop";

const VALID_STAGES = new Set(PROSPECT_STAGES.map((s) => s.id));

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("business_prospects")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at");

    if (error) throw error;
    return NextResponse.json({ prospects: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProspectInput;

    if (!body.company_name?.trim()) {
      return NextResponse.json({ error: "请填写客户名称" }, { status: 400 });
    }

    const stage = body.stage ?? "lead";
    if (!VALID_STAGES.has(stage)) {
      return NextResponse.json({ error: "无效的开发状态" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { count } = await supabase
      .from("business_prospects")
      .select("*", { count: "exact", head: true })
      .eq("stage", stage)
      .eq("is_active", true);

    const { data, error } = await supabase
      .from("business_prospects")
      .insert({
        company_name: body.company_name.trim(),
        website: body.website?.trim() ?? "",
        annual_demand: body.annual_demand?.trim() ?? "",
        location: body.location?.trim() ?? "",
        stage,
        contact_name: body.contact_name?.trim() ?? "",
        contact_phone: body.contact_phone?.trim() ?? "",
        notes: body.notes?.trim() ?? "",
        sort_order: body.sort_order ?? (count ?? 0),
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ prospect: data });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
