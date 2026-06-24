import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatApiError } from "@/lib/errors";
import { assertBusinessAuthApi } from "@/lib/business-auth";
import { PROSPECT_STAGES, type ProspectInput } from "@/types/business-develop";

const VALID_STAGES = new Set(PROSPECT_STAGES.map((s) => s.id));

const PROSPECT_SELECT = `
  *,
  contacts:business_prospect_contacts!business_prospect_contacts_prospect_id_fkey(
    *,
    email_schedules:business_prospect_email_schedules(*),
    communication_logs:business_prospect_contact_logs(*)
  )
`;

function dedupeContacts<T extends { id: string; is_active?: boolean; sort_order?: number }>(
  contacts: T[]
): T[] {
  const seen = new Set<string>();
  return contacts
    .filter((c) => c.is_active !== false)
    .filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    })
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

function normalizeProspects<T extends { contacts?: Array<{ id: string; is_active?: boolean; email_schedules?: unknown[]; sort_order?: number }> }>(
  rows: T[]
): T[] {
  return rows.map((row) => ({
    ...row,
    contacts: dedupeContacts(row.contacts ?? []).map((c) => ({
      ...c,
      email_schedules: ((c.email_schedules as Array<{ scheduled_at: string }>) ?? []).sort(
        (a, b) => a.scheduled_at.localeCompare(b.scheduled_at)
      ),
      communication_logs: (
        (c as { communication_logs?: Array<{ contacted_at: string }> }).communication_logs ?? []
      ).sort((a, b) => b.contacted_at.localeCompare(a.contacted_at)),
    })),
  }));
}

export async function GET() {
  const auth = await assertBusinessAuthApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("business_prospects")
      .select(PROSPECT_SELECT)
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at");

    if (error) throw error;
    return NextResponse.json({ prospects: normalizeProspects(data ?? []) });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await assertBusinessAuthApi();
  if (auth instanceof NextResponse) return auth;

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

    const { data: prospect, error } = await supabase
      .from("business_prospects")
      .insert({
        company_name: body.company_name.trim(),
        website: body.website?.trim() ?? "",
        annual_demand: body.annual_demand?.trim() ?? "",
        location: body.location?.trim() ?? "",
        stage,
        contact_name: "",
        contact_phone: "",
        notes: body.notes?.trim() ?? "",
        sort_order: body.sort_order ?? (count ?? 0),
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    const contacts = (body.contacts ?? []).filter((c) => c.name?.trim());
    if (contacts.length > 0) {
      const { error: contactError } = await supabase.from("business_prospect_contacts").insert(
        contacts.map((c, i) => ({
          prospect_id: prospect.id,
          name: c.name.trim(),
          phone: c.phone?.trim() ?? "",
          email: c.email?.trim() ?? "",
          sort_order: c.sort_order ?? i,
          is_active: true,
        }))
      );
      if (contactError) throw contactError;
    }

    const { data: full, error: fetchError } = await supabase
      .from("business_prospects")
      .select(PROSPECT_SELECT)
      .eq("id", prospect.id)
      .single();

    if (fetchError) throw fetchError;
    return NextResponse.json({ prospect: normalizeProspects([full])[0] });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
