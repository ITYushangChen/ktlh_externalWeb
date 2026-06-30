export type DeliveryNoteStatus = "draft" | "submitted" | "cancelled";

export interface SupplierProfile {
  id: string;
  internal_supplier_id: number;
  supplier_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
}

export interface PurchaseOrderSnapshot {
  id: string;
  internal_order_id: number;
  internal_supplier_id: number;
  order_number: string;
  order_time: string;
  expected_arrival_time: string | null;
  order_amount: number;
  order_status: string;
  payment_status: string | null;
  responsible_person: string | null;
  remark: string | null;
  buyer_company: string;
  buyer_address: string;
  synced_at: string;
}

export interface PurchaseOrderItemSnapshot {
  id: string;
  snapshot_order_id: string;
  internal_order_item_id: number;
  material_code: string | null;
  material_name: string;
  material_spec: string | null;
  unit: string;
  unit_price: number;
  order_quantity: number;
  received_quantity: number;
  item_amount: number;
  remark: string | null;
}

export interface PurchaseOrderWithItems extends PurchaseOrderSnapshot {
  items: ItemWithPendingQty[];
  pending_item_count?: number;
  deliverable_item_count?: number;
}

export interface DeliveryNote {
  id: string;
  delivery_number: string;
  snapshot_order_id: string;
  internal_order_id: number;
  internal_supplier_id: number;
  supplier_profile_id: string | null;
  supplier_name: string;
  supplier_contact: string | null;
  supplier_phone: string | null;
  supplier_address: string | null;
  buyer_company: string;
  buyer_address: string;
  buyer_contact: string | null;
  delivery_date: string;
  expected_arrival_time: string | null;
  vehicle_plate: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  status: DeliveryNoteStatus;
  remark: string | null;
  pdf_storage_path: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryNoteItem {
  id: string;
  delivery_note_id: string;
  snapshot_item_id: string;
  internal_order_item_id: number;
  material_code: string | null;
  material_name: string;
  material_spec: string | null;
  unit: string;
  unit_price: number;
  delivery_quantity: number;
  line_remark: string | null;
  sort_order: number;
}

export interface DeliveryNoteWithItems extends DeliveryNote {
  items: DeliveryNoteItem[];
  order_number?: string;
}

export interface ItemWithPendingQty extends PurchaseOrderItemSnapshot {
  pending_delivery_qty: number;
  deliverable_qty: number;
}

export interface CreateDeliveryLineInput {
  snapshot_item_id: string;
  delivery_quantity: number;
  line_remark?: string | null;
}

export interface CreateDeliveryNoteInput {
  snapshot_order_id: string;
  delivery_date: string;
  expected_arrival_time?: string | null;
  vehicle_plate?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  remark?: string | null;
  lines: CreateDeliveryLineInput[];
}
