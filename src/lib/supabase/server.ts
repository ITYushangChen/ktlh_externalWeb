import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicSupabaseEnv, isSupabaseConfigured } from "@/lib/env";

export async function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("SUPABASE_ENV_MISSING");
  }

  const { url, anonKey } = getPublicSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — ignore
          }
        },
      },
    }
  );
}
