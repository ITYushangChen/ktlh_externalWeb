import { NextResponse } from "next/server";
import { assertSupplierAuthApi, SupplierAuthError } from "@/lib/supplier-auth";
import { listPurchaseOrders } from "@/lib/supplier-orders";

export async function GET() {
  try {
    const { profile } = await assertSupplierAuthApi();
    const orders = await listPurchaseOrders(profile);
    return NextResponse.json({ orders });
  } catch (e) {
    if (e instanceof SupplierAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const msg = e instanceof Error ? e.message : "加载失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
