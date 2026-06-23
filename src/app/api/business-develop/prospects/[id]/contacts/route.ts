import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatApiError } from "@/lib/errors";
import { assertBusinessAuthApi } from "@/lib/business-auth";
import type { ContactInput } from "@/types/business-develop";

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
  const auth = await assertBusinessAuthApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as ContactInput;

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "请填写联系人姓名" }, { status: 400 });
    }

    const trimmedName = body.name.trim();
    const trimmedPhone = body.phone?.trim() ?? "";
    const trimmedEmail = body.email?.trim() ?? "";

    const supabase = createAdminClient();

    // 防止重复提交在短时间内插入两条相同记录
    const { data: recentDuplicate } = await supabase
      .from("business_prospect_contacts")
      .select("*")
      .eq("prospect_id", prospectId)
      .eq("is_active", true)
      .eq("name", trimmedName)
      .eq("phone", trimmedPhone)
      .eq("email", trimmedEmail)
      .order("created_at", { ascending: false })
      .limit(1);

    const duplicate = recentDuplicate?.[0];
    if (duplicate) {
      const ageMs = Date.now() - new Date(duplicate.created_at).getTime();
      if (ageMs < 10_000) {
        return NextResponse.json({ contact: duplicate });
      }
    }

    const { count } = await supabase
      .from("business_prospect_contacts")
      .select("*", { count: "exact", head: true })
      .eq("prospect_id", prospectId)
      .eq("is_active", true);

    const { data, error } = await supabase
      .from("business_prospect_contacts")
      .insert({
        prospect_id: prospectId,
        name: trimmedName,
        phone: trimmedPhone,
        email: trimmedEmail,
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
