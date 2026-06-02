import { createClient } from "@/lib/supabase/server";
import { fetchActiveDeliveryList } from "@/lib/delivery";
import { DeliveryPicker } from "@/components/driver/DeliveryPicker";

export const dynamic = "force-dynamic";

export default async function DriverSelectPage() {
  const supabase = await createClient();
  const items = await fetchActiveDeliveryList(supabase);

  return (
    <main className="min-h-screen pb-8">
      <header className="bg-blue-600 text-white px-4 pt-8 pb-10 rounded-b-3xl shadow-lg">
        <p className="text-blue-100 text-xs font-medium">KTLH 厂区送货</p>
        <h1 className="text-2xl font-bold mt-1">请选择本次货物</h1>
        <p className="text-blue-100 text-sm mt-2 leading-relaxed">
          选择与您车上货物相符的条目，即可查看卸货流程、联系人与路线指引。
        </p>
      </header>

      <div className="px-4 -mt-4">
        <DeliveryPicker items={items} />
      </div>
    </main>
  );
}
