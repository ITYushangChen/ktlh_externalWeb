import { ConfigError } from "@/components/ConfigError";
import { DriverHome } from "@/components/driver/DriverHome";
import { loadDriverHome } from "@/lib/driver-home";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const state = await loadDriverHome();

  if (state.status === "config") {
    return <ConfigError context="司机首页" />;
  }

  if (state.status === "error") {
    return (
      <ConfigError context="无法加载送货类型，请稍后重试或联系厂区调度。" />
    );
  }

  return <DriverHome items={state.items} />;
}
