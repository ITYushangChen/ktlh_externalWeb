import { NewDeliveryForm } from "@/components/suppliers/NewDeliveryForm";
import { SupplierShell } from "@/components/suppliers/SupplierShell";
import { requireSupplierAuth } from "@/lib/supplier-auth";

export const metadata = {
  title: "新建送货单 · 供应商送货",
};

export default async function NewDeliveryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { profile } = await requireSupplierAuth();
  const { id } = await params;

  return (
    <SupplierShell supplierName={profile.supplier_name}>
      <NewDeliveryForm orderId={id} />
    </SupplierShell>
  );
}
