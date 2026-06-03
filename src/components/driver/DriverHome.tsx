import { DeliveryPicker } from "./DeliveryPicker";
import type { DeliveryListItem } from "@/types/delivery";

export function DriverHome({ items }: { items: DeliveryListItem[] }) {
  return (
    <div className="driver-page min-h-[100dvh] pb-10">
      <header className="driver-hero px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-12">
        <div className="driver-hero-badge">KTLH</div>
        <h1 className="driver-hero-title">开拓隆海送货引导</h1>
        <p className="driver-hero-sub">请选择本次送货类型</p>
      </header>

      <section className="px-4 -mt-6 relative z-10">
        <DeliveryPicker items={items} />
      </section>
    </div>
  );
}
