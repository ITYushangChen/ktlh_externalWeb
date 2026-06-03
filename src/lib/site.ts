import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeliveryType, PublicGuideData, SiteSettings } from "@/types/site";

export function parseFlowSteps(flow: string): string[] {
  return flow
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function fetchSiteSettings(
  supabase: SupabaseClient
): Promise<SiteSettings | null> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function fetchActiveDeliveryTypes(
  supabase: SupabaseClient
): Promise<DeliveryType[]> {
  const { data, error } = await supabase
    .from("delivery_types")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data;
}

export async function fetchAllDeliveryTypes(
  supabase: SupabaseClient
): Promise<DeliveryType[]> {
  const { data, error } = await supabase
    .from("delivery_types")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data;
}

export async function fetchPublicGuide(
  supabase: SupabaseClient
): Promise<PublicGuideData> {
  const [settings, types] = await Promise.all([
    fetchSiteSettings(supabase),
    fetchActiveDeliveryTypes(supabase),
  ]);

  const flow = settings?.delivery_flow ?? "";
  return {
    delivery_flow: flow,
    flow_steps: parseFlowSteps(flow),
    types,
  };
}
