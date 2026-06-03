import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppBaseUrl } from "@/lib/env";
import type { DeliveryBundle, DeliveryListItem } from "@/types/delivery";

export function generateDeliveryCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** 固定二维码指向的司机入口（首页选货） */
export function getDriverPortalUrl(): string {
  return getAppBaseUrl();
}

export function getDeliveryGuideUrl(id: string): string {
  return `${getAppBaseUrl()}/guide/${id}`;
}

export async function fetchActiveDeliveryList(
  supabase: SupabaseClient
): Promise<DeliveryListItem[]> {
  const { data, error } = await supabase
    .from("deliveries")
    .select("id, title, picker_label, cargo_description, supplier_name, list_sort_order")
    .eq("status", "active")
    .order("list_sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data;
}

export async function fetchDeliveryById(
  supabase: SupabaseClient,
  id: string
): Promise<DeliveryBundle | null> {
  const { data: delivery, error } = await supabase
    .from("deliveries")
    .select("*")
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();

  if (error || !delivery) return null;
  return fetchBundleChildren(supabase, delivery);
}

export async function fetchDeliveryByCode(
  supabase: SupabaseClient,
  code: string
): Promise<DeliveryBundle | null> {
  const normalized = code.trim().toUpperCase();

  const { data: delivery, error } = await supabase
    .from("deliveries")
    .select("*")
    .eq("code", normalized)
    .eq("status", "active")
    .maybeSingle();

  if (error || !delivery) return null;
  return fetchBundleChildren(supabase, delivery);
}

async function fetchBundleChildren(
  supabase: SupabaseClient,
  delivery: DeliveryBundle["delivery"]
): Promise<DeliveryBundle> {
  const [stepsRes, contactsRes, nodesRes, edgesRes] = await Promise.all([
    supabase
      .from("delivery_steps")
      .select("*")
      .eq("delivery_id", delivery.id)
      .order("sort_order"),
    supabase
      .from("delivery_contacts")
      .select("*")
      .eq("delivery_id", delivery.id)
      .order("sort_order"),
    supabase.from("path_nodes").select("*").eq("delivery_id", delivery.id),
    supabase.from("path_edges").select("*").eq("delivery_id", delivery.id),
  ]);

  return {
    delivery,
    steps: stepsRes.data ?? [],
    contacts: contactsRes.data ?? [],
    nodes: nodesRes.data ?? [],
    edges: edgesRes.data ?? [],
  };
}

export function displayPickerLabel(item: DeliveryListItem): string {
  return item.picker_label?.trim() || item.title;
}
