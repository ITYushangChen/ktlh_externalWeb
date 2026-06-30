import { SupplierOrderDetail } from "@/components/suppliers/SupplierOrderDetail";
import { SupplierShell } from "@/components/suppliers/SupplierShell";
import { requireSupplierAuth } from "@/lib/supplier-auth";

export const metadata = {
  title: "采购单详情 · 供应商送货",
};

export default async function SupplierOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { profile } = await requireSupplierAuth();
  const { id } = await params;

  return (
    <SupplierShell supplierName={profile.supplier_name}>
      <SupplierOrderDetail orderId={id} />
    </SupplierShell>
  );
}
