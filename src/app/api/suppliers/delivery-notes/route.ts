import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertSupplierAuthApi, SupplierAuthError } from "@/lib/supplier-auth";
import {
  getItemsForDeliveryValidation,
  getPurchaseOrder,
} from "@/lib/supplier-orders";
import { validateDeliveryLines } from "@/lib/supplier-delivery";
import type { CreateDeliveryNoteInput } from "@/types/supplier";

export async function POST(request: Request) {
  try {
    const { user, profile } = await assertSupplierAuthApi();
    const body = (await request.json()) as CreateDeliveryNoteInput;

    if (!body.snapshot_order_id || !body.delivery_date || !body.lines?.length) {
      return NextResponse.json({ error: "请填写送货日期并选择物料" }, { status: 400 });
    }

    const order = await getPurchaseOrder(body.snapshot_order_id, profile);
    if (!order) {
      return NextResponse.json({ error: "采购单不存在" }, { status: 404 });
    }

    const itemIds = body.lines.map((l) => l.snapshot_item_id);
    const items = await getItemsForDeliveryValidation(body.snapshot_order_id, itemIds);
    const validationError = validateDeliveryLines(items, body.lines);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: deliveryNumber, error: seqError } = await supabase.rpc(
      "next_delivery_number"
    );
    if (seqError) throw seqError;

    const { data: note, error: noteError } = await supabase
      .from("delivery_notes")
      .insert({
        delivery_number: deliveryNumber,
        snapshot_order_id: order.id,
        internal_order_id: order.internal_order_id,
        internal_supplier_id: order.internal_supplier_id,
        supplier_profile_id: user.id,
        supplier_name: profile.supplier_name,
        supplier_contact: profile.contact_name,
        supplier_phone: profile.phone,
        supplier_address: profile.address,
        buyer_company: order.buyer_company,
        buyer_address: order.buyer_address,
        buyer_contact: order.responsible_person,
        delivery_date: body.delivery_date,
        expected_arrival_time: body.expected_arrival_time ?? order.expected_arrival_time,
        vehicle_plate: body.vehicle_plate?.trim() || null,
        driver_name: body.driver_name?.trim() || null,
        driver_phone: body.driver_phone?.trim() || null,
        remark: body.remark?.trim() || null,
        status: "draft",
      })
      .select()
      .single();

    if (noteError) throw noteError;

    const itemMap = new Map(items.map((i) => [i.id, i]));
    const lineRows = body.lines.map((line, i) => {
      const item = itemMap.get(line.snapshot_item_id)!;
      return {
        delivery_note_id: note.id,
        snapshot_item_id: line.snapshot_item_id,
        internal_order_item_id: item.internal_order_item_id,
        material_code: item.material_code,
        material_name: item.material_name,
        material_spec: item.material_spec,
        unit: item.unit,
        unit_price: item.unit_price,
        delivery_quantity: line.delivery_quantity,
        line_remark: line.line_remark?.trim() || null,
        sort_order: i,
      };
    });

    const { error: itemsError } = await supabase.from("delivery_note_items").insert(lineRows);
    if (itemsError) {
      await supabase.from("delivery_notes").delete().eq("id", note.id);
      throw itemsError;
    }

    return NextResponse.json({ deliveryNote: note });
  } catch (e) {
    if (e instanceof SupplierAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const msg = e instanceof Error ? e.message : "创建失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
