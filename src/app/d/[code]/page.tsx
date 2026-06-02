import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchDeliveryByCode } from "@/lib/delivery";

/** 旧版按码直达链接，重定向到选货后的指引页 */
export default async function LegacyDeliveryPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();
  const data = await fetchDeliveryByCode(supabase, code);

  if (!data) {
    redirect("/s");
  }

  redirect(`/s/${data.delivery.id}`);
}
