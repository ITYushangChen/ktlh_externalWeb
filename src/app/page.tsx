import { ConfigError } from "@/components/ConfigError";
import { DriverPortal } from "@/components/driver/DriverPortal";
import { loadPublicGuide } from "@/lib/public-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const state = await loadPublicGuide();

  if (state.status === "config") {
    return <ConfigError context="司机引导页" />;
  }

  if (state.status === "error") {
    return (
      <ConfigError context="无法加载数据，请检查数据库是否已执行 003_simplified.sql" />
    );
  }

  return <DriverPortal data={state.data} />;
}
