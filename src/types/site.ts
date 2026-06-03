export interface SiteSettings {
  id: number;
  delivery_flow: string;
  updated_at: string;
}

export interface DeliveryType {
  id: string;
  name: string;
  contact_name: string;
  phone: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeliveryTypeInput {
  name: string;
  contact_name: string;
  phone: string;
  sort_order?: number;
}

export interface PublicGuideData {
  delivery_flow: string;
  flow_steps: string[];
  types: DeliveryType[];
}
