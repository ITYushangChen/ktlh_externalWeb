import { createAdminClient } from "@/lib/supabase/admin";
import type { WaibaoRequirement } from "@/types/waibao";

export async function listWaibaoRequirements(): Promise<WaibaoRequirement[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("waibao_requirements")
    .select(
      `
      *,
      creator:waibao_users!waibao_requirements_created_by_fkey(username),
      claimant:waibao_users!waibao_requirements_claimed_by_fkey(username)
    `
    )
    .order("sort_order")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const r = row as WaibaoRequirement & {
      creator?: { username: string } | null;
      claimant?: { username: string } | null;
    };
    return {
      ...r,
      price: Number(r.price),
      creator_username: r.creator?.username,
      claimant_username: r.claimant?.username,
    };
  });
}

export async function getWaibaoRequirement(id: string): Promise<WaibaoRequirement | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("waibao_requirements")
    .select(
      `
      *,
      creator:waibao_users!waibao_requirements_created_by_fkey(username),
      claimant:waibao_users!waibao_requirements_claimed_by_fkey(username)
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const r = data as WaibaoRequirement & {
    creator?: { username: string } | null;
    claimant?: { username: string } | null;
  };

  return {
    ...r,
    price: Number(r.price),
    creator_username: r.creator?.username,
    claimant_username: r.claimant?.username,
  };
}
