import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatApiError } from "@/lib/errors";
import type { DeliveryTypeInput } from "@/types/site";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("delivery_types")
      .select("*")
      .order("sort_order")
      .order("created_at");

    if (error) throw error;
    return NextResponse.json({ types: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DeliveryTypeInput;

    if (!body.name?.trim() || !body.contact_name?.trim() || !body.phone?.trim()) {
      return NextResponse.json(
        { error: "请填写送货类型、负责人和手机号" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("delivery_types")
      .insert({
        name: body.name.trim(),
        contact_name: body.contact_name.trim(),
        phone: body.phone.trim(),
        sort_order: body.sort_order ?? 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ type: data });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
