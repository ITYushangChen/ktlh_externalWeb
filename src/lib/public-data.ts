import { createClient } from "@/lib/supabase/server";
import { fetchPublicGuide } from "@/lib/site";
import { isSupabaseConfigured } from "@/lib/env";
import type { PublicGuideData } from "@/types/site";

export type PublicPageState =
  | { status: "config" }
  | { status: "error" }
  | { status: "ok"; data: PublicGuideData };

export async function loadPublicGuide(): Promise<PublicPageState> {
  if (!isSupabaseConfigured()) {
    return { status: "config" };
  }

  try {
    const supabase = await createClient();
    const data = await fetchPublicGuide(supabase);
    return { status: "ok", data };
  } catch {
    return { status: "error" };
  }
}
