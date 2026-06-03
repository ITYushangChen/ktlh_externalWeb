import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatApiError } from "@/lib/errors";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      settings: data ?? { id: 1, delivery_flow: "", updated_at: null },
    });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { delivery_flow } = (await request.json()) as { delivery_flow?: string };
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("site_settings")
      .upsert({
        id: 1,
        delivery_flow: delivery_flow ?? "",
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ settings: data });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
