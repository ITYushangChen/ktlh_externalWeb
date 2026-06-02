export type DeliveryStatus = "active" | "completed" | "cancelled";

export interface Delivery {
  id: string;
  code: string;
  title: string;
  picker_label: string | null;
  list_sort_order: number;
  supplier_name: string | null;
  cargo_description: string | null;
  status: DeliveryStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** 司机选货列表项 */
export interface DeliveryListItem {
  id: string;
  title: string;
  picker_label: string | null;
  cargo_description: string | null;
  supplier_name: string | null;
  list_sort_order: number;
}

export interface DeliveryStep {
  id: string;
  delivery_id: string;
  sort_order: number;
  title: string;
  description: string | null;
  location_label: string | null;
}

export interface DeliveryContact {
  id: string;
  delivery_id: string;
  name: string;
  role: string | null;
  phone: string;
  wechat: string | null;
  is_primary: boolean;
  sort_order: number;
}

export interface PathNode {
  id: string;
  delivery_id: string;
  node_key: string;
  label: string;
  x: number;
  y: number;
  z: number;
  floor: number;
  is_destination: boolean;
  instruction: string | null;
}

export interface PathEdge {
  id: string;
  delivery_id: string;
  from_key: string;
  to_key: string;
}

export interface DeliveryBundle {
  delivery: Delivery;
  steps: DeliveryStep[];
  contacts: DeliveryContact[];
  nodes: PathNode[];
  edges: PathEdge[];
}

export interface DeliveryFormInput {
  title: string;
  picker_label?: string;
  list_sort_order?: number;
  supplier_name?: string;
  cargo_description?: string;
  notes?: string;
  steps: { title: string; description?: string; location_label?: string }[];
  contacts: {
    name: string;
    role?: string;
    phone: string;
    wechat?: string;
    is_primary?: boolean;
  }[];
  path: {
    nodes: {
      node_key: string;
      label: string;
      x: number;
      y: number;
      z?: number;
      floor?: number;
      is_destination?: boolean;
      instruction?: string;
    }[];
    edges: { from_key: string; to_key: string }[];
  };
}
