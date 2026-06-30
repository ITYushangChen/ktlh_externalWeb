import type {
  CreateDeliveryLineInput,
  ItemWithPendingQty,
  PurchaseOrderItemSnapshot,
} from "@/types/supplier";

export function getDeliverableQty(
  item: Pick<PurchaseOrderItemSnapshot, "order_quantity" | "received_quantity">,
  pendingQty: number
): number {
  return Math.max(0, Number(item.order_quantity) - Number(item.received_quantity) - pendingQty);
}

export function validateDeliveryLine(
  item: ItemWithPendingQty,
  deliveryQty: number
): string | null {
  if (!Number.isFinite(deliveryQty) || deliveryQty <= 0) {
    return "送货数量须大于 0";
  }
  if (deliveryQty > item.deliverable_qty) {
    return `超过可送数量（最多 ${item.deliverable_qty} ${item.unit}）`;
  }
  return null;
}

export function validateDeliveryLines(
  items: ItemWithPendingQty[],
  lines: CreateDeliveryLineInput[]
): string | null {
  if (!lines.length) {
    return "请至少选择一行物料";
  }

  const itemMap = new Map(items.map((i) => [i.id, i]));

  for (const line of lines) {
    const item = itemMap.get(line.snapshot_item_id);
    if (!item) {
      return "包含无效的物料行";
    }
    const err = validateDeliveryLine(item, line.delivery_quantity);
    if (err) return `${item.material_name}：${err}`;
  }

  return null;
}

export function todayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatMoney(n: number): string {
  return n.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  submitted: "已提交",
  cancelled: "已作废",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  待处理: "待处理",
  处理中: "处理中",
  已收货: "已收货",
  已完成: "已完成",
  已取消: "已取消",
};
