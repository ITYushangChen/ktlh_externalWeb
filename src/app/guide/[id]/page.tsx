import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchDeliveryById } from "@/lib/delivery";
import { DriverGuide } from "@/components/driver/DriverGuide";
import { isSupabaseConfigured } from "@/lib/env";
import { ConfigError } from "@/components/ConfigError";

export default async function GuidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return <ConfigError context="送货指引页" />;
  }

  let data = null;
  try {
    const supabase = await createClient();
    data = await fetchDeliveryById(supabase, id);
  } catch {
    return <ConfigError context="无法加载送货指引" />;
  }

  if (!data) {
    return (
      <main className="driver-page min-h-[100dvh] flex items-center justify-center p-6">
        <div className="driver-card p-8 text-center max-w-sm w-full">
          <div className="text-5xl mb-4" aria-hidden>
            📦
          </div>
          <h1 className="text-xl font-bold text-slate-900">该送货类型暂不可用</h1>
          <p className="text-slate-500 text-sm mt-2 leading-relaxed">
            可能已完成送货，请返回重新选择。
          </p>
          <Link href="/" className="driver-btn-primary mt-6 inline-flex w-full no-underline">
            返回选择
          </Link>
        </div>
      </main>
    );
  }

  return <DriverGuide data={data} backHref="/" />;
}
