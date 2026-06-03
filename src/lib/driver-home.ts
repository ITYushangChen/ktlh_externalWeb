import { createClient } from "@/lib/supabase/server";
import { fetchActiveDeliveryList } from "@/lib/delivery";
import { isSupabaseConfigured } from "@/lib/env";
import type { DeliveryListItem } from "@/types/delivery";

export type DriverHomeState =
  | { status: "config" }
  | { status: "error" }
  | { status: "ok"; items: DeliveryListItem[] };

export async function loadDriverHome(): Promise<DriverHomeState> {
  if (!isSupabaseConfigured()) {
    return { status: "config" };
  }

  try {
    const supabase = await createClient();
    const items = await fetchActiveDeliveryList(supabase);
    return { status: "ok", items };
  } catch {
    return { status: "error" };
  }
}
