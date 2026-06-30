import { createClient } from "@/lib/supabase/server";
import { getDeliverableQty } from "@/lib/supplier-delivery";
import type {
  DeliveryNote,
  DeliveryNoteItem,
  DeliveryNoteWithItems,
  ItemWithPendingQty,
  PurchaseOrderItemSnapshot,
  PurchaseOrderSnapshot,
  PurchaseOrderWithItems,
  SupplierProfile,
} from "@/types/supplier";

const HIDDEN_ORDER_STATUSES = ["已完成", "已取消"] as const;

async function getPendingQtyByItemIds(
  itemIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!itemIds.length) return map;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("delivery_note_items")
    .select(
      `
      snapshot_item_id,
      delivery_quantity,
      delivery_notes!inner(status)
    `
    )
    .in("snapshot_item_id", itemIds)
    .eq("delivery_notes.status", "submitted");

  if (error) throw error;

  for (const row of data ?? []) {
    const itemId = row.snapshot_item_id as string;
    const qty = Number(row.delivery_quantity);
    map.set(itemId, (map.get(itemId) ?? 0) + qty);
  }

  return map;
}

export function enrichItemsWithPending(
  items: PurchaseOrderItemSnapshot[],
  pendingMap: Map<string, number>
): ItemWithPendingQty[] {
  return items.map((item) => {
    const pending_delivery_qty = pendingMap.get(item.id) ?? 0;
    return {
      ...item,
      pending_delivery_qty,
      deliverable_qty: getDeliverableQty(item, pending_delivery_qty),
    };
  });
}

export async function listPurchaseOrders(
  profile: SupplierProfile
): Promise<PurchaseOrderWithItems[]> {
  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from("purchase_order_snapshots")
    .select(
      `
      *,
      items:purchase_order_item_snapshots(*)
    `
    )
    .eq("internal_supplier_id", profile.internal_supplier_id)
    .not("order_status", "in", `(${HIDDEN_ORDER_STATUSES.map((s) => `"${s}"`).join(",")})`)
    .order("order_time", { ascending: false });

  if (error) throw error;

  const allItemIds = (orders ?? []).flatMap(
    (o) => (o.items as PurchaseOrderItemSnapshot[] | null)?.map((i) => i.id) ?? []
  );
  const pendingMap = await getPendingQtyByItemIds(allItemIds);

  return (orders ?? [])
    .map((row) => {
      const items = enrichItemsWithPending(
        (row.items as PurchaseOrderItemSnapshot[]) ?? [],
        pendingMap
      );
      const deliverable_item_count = items.filter((i) => i.deliverable_qty > 0).length;
      return {
        ...(row as PurchaseOrderSnapshot),
        items,
        deliverable_item_count,
        pending_item_count: items.filter((i) => i.deliverable_qty > 0).length,
      };
    })
    .filter((o) => o.deliverable_item_count > 0);
}

export async function getPurchaseOrder(
  orderId: string,
  profile: SupplierProfile
): Promise<PurchaseOrderWithItems | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("purchase_order_snapshots")
    .select(
      `
      *,
      items:purchase_order_item_snapshots(*)
    `
    )
    .eq("id", orderId)
    .eq("internal_supplier_id", profile.internal_supplier_id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const rawItems = (data.items as PurchaseOrderItemSnapshot[]) ?? [];
  const pendingMap = await getPendingQtyByItemIds(rawItems.map((i) => i.id));
  const items = enrichItemsWithPending(rawItems, pendingMap);

  return {
    ...(data as PurchaseOrderSnapshot),
    items,
    deliverable_item_count: items.filter((i) => i.deliverable_qty > 0).length,
  };
}

export async function listDeliveryNotesForOrder(
  orderId: string
): Promise<DeliveryNote[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("delivery_notes")
    .select("*")
    .eq("snapshot_order_id", orderId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DeliveryNote[];
}

export async function getDeliveryNote(
  noteId: string
): Promise<DeliveryNoteWithItems | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("delivery_notes")
    .select(
      `
      *,
      items:delivery_note_items(*),
      order:purchase_order_snapshots(order_number)
    `
    )
    .eq("id", noteId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const orderJoin = data.order as { order_number: string } | null;
  const items = ((data.items as DeliveryNoteItem[]) ?? []).sort(
    (a, b) => a.sort_order - b.sort_order
  );

  const {
    order: _order,
    items: _items,
    ...note
  } = data as DeliveryNote & {
    items: DeliveryNoteItem[];
    order: { order_number: string } | null;
  };

  void _order;
  void _items;

  return {
    ...note,
    items,
    order_number: orderJoin?.order_number,
  };
}

export async function getItemsForDeliveryValidation(
  orderId: string,
  itemIds: string[]
): Promise<ItemWithPendingQty[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchase_order_item_snapshots")
    .select("*")
    .eq("snapshot_order_id", orderId)
    .in("id", itemIds);

  if (error) throw error;
  const pendingMap = await getPendingQtyByItemIds(itemIds);
  return enrichItemsWithPending((data ?? []) as PurchaseOrderItemSnapshot[], pendingMap);
}
