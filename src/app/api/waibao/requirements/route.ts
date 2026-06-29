import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatApiError } from "@/lib/errors";
import { listWaibaoRequirements } from "@/lib/waibao-requirements";
import { assertWaibaoAdminApi, assertWaibaoAuthApi } from "@/lib/waibao-auth";
import type { WaibaoRequirementInput } from "@/types/waibao";

export async function GET() {
  const auth = await assertWaibaoAuthApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const requirements = await listWaibaoRequirements();
    return NextResponse.json({ requirements });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await assertWaibaoAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as WaibaoRequirementInput;

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "请填写需求标题" }, { status: 400 });
    }

    const price = Number(body.price);
    if (Number.isNaN(price) || price < 0) {
      return NextResponse.json({ error: "请填写有效价格" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { count } = await supabase
      .from("waibao_requirements")
      .select("*", { count: "exact", head: true })
      .eq("status", "open");

    const { data, error } = await supabase
      .from("waibao_requirements")
      .insert({
        title: body.title.trim(),
        description: body.description?.trim() ?? "",
        price,
        status: "open",
        created_by: auth.userId,
        sort_order: body.sort_order ?? (count ?? 0),
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ requirement: { ...data, price: Number(data.price) } });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
