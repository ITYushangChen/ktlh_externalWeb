import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertSupplierAuthApi, SupplierAuthError } from "@/lib/supplier-auth";
import { getDeliveryNote } from "@/lib/supplier-orders";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await assertSupplierAuthApi();
    const { id } = await params;

    const note = await getDeliveryNote(id);
    if (!note) {
      return NextResponse.json({ error: "送货单不存在" }, { status: 404 });
    }
    if (note.status !== "draft") {
      return NextResponse.json({ error: "仅草稿可提交" }, { status: 400 });
    }
    if (!note.items.length) {
      return NextResponse.json({ error: "送货单无明细" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("delivery_notes")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "draft");

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof SupplierAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const msg = e instanceof Error ? e.message : "提交失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
