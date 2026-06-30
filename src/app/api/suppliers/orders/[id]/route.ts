import { NextResponse } from "next/server";
import {
  getPurchaseOrder,
  listDeliveryNotesForOrder,
} from "@/lib/supplier-orders";
import { assertSupplierAuthApi, SupplierAuthError } from "@/lib/supplier-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { profile } = await assertSupplierAuthApi();
    const { id } = await params;
    const order = await getPurchaseOrder(id, profile);
    if (!order) {
      return NextResponse.json({ error: "采购单不存在" }, { status: 404 });
    }
    const deliveryNotes = await listDeliveryNotesForOrder(id);
    return NextResponse.json({ order, deliveryNotes });
  } catch (e) {
    if (e instanceof SupplierAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const msg = e instanceof Error ? e.message : "加载失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
