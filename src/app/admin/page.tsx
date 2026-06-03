import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { getRequestAppBaseUrl } from "@/lib/app-base-url.server";

export default async function AdminPage() {
  const appUrl = await getRequestAppBaseUrl();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">送货引导管理</h1>
      <AdminDashboard appUrl={appUrl} />
    </div>
  );
}
