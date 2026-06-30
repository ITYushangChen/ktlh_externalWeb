import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { SupplierProfile } from "@/types/supplier";

export class SupplierAuthError extends Error {
  constructor(
    message: string,
    public status: number = 401
  ) {
    super(message);
    this.name = "SupplierAuthError";
  }
}

export async function getSupplierSession() {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("supplier_profiles")
    .select("*")
    .eq("id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  return { user, profile: profile as SupplierProfile | null };
}

export async function requireSupplierAuth(): Promise<{
  user: { id: string; email?: string };
  profile: SupplierProfile;
}> {
  const session = await getSupplierSession();
  if (!session?.user) {
    redirect("/suppliers/login");
  }
  if (!session.profile) {
    redirect("/suppliers/login?error=unbound");
  }
  return { user: session.user, profile: session.profile };
}

export async function assertSupplierAuthApi() {
  const session = await getSupplierSession();
  if (!session?.user) {
    throw new SupplierAuthError("未登录或登录已过期", 401);
  }
  if (!session.profile) {
    throw new SupplierAuthError("账号未绑定供应商档案，请联系采购部", 403);
  }
  return { user: session.user, profile: session.profile };
}
