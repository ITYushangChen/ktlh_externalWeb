import { DeliveryNoteDetail } from "@/components/suppliers/DeliveryNoteDetail";
import { SupplierShell } from "@/components/suppliers/SupplierShell";
import { requireSupplierAuth } from "@/lib/supplier-auth";

export const metadata = {
  title: "送货单详情 · 供应商送货",
};

export default async function DeliveryNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { profile } = await requireSupplierAuth();
  const { id } = await params;

  return (
    <SupplierShell supplierName={profile.supplier_name}>
      <DeliveryNoteDetail noteId={id} />
    </SupplierShell>
  );
}
