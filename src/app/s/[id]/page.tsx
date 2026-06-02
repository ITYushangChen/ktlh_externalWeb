import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchDeliveryById } from "@/lib/delivery";
import { DriverGuide } from "@/components/driver/DriverGuide";

export default async function DriverGuidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const data = await fetchDeliveryById(supabase, id);

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 text-center max-w-sm">
          <p className="text-4xl mb-4">⚠️</p>
          <h1 className="text-xl font-bold">该货物指引不可用</h1>
          <p className="text-slate-500 text-sm mt-2">
            可能已送完或信息已更新，请返回重新选择。
          </p>
          <Link href="/s" className="btn btn-primary mt-6 inline-block no-underline">
            返回选货
          </Link>
        </div>
      </main>
    );
  }

  return <DriverGuide data={data} backHref="/s" />;
}
