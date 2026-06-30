import { SupplierOrderList } from "@/components/suppliers/SupplierOrderList";
import { SupplierShell } from "@/components/suppliers/SupplierShell";
import { requireSupplierAuth } from "@/lib/supplier-auth";

export const metadata = {
  title: "供应商送货 · 开拓隆海",
};

export default async function SuppliersPage() {
  const { profile } = await requireSupplierAuth();

  return (
    <SupplierShell supplierName={profile.supplier_name}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">我的采购单</h1>
        <p className="text-sm text-slate-500 mt-1">
          查看待送货采购订单，选择物料生成送货单
        </p>
      </div>
      <SupplierOrderList />
    </SupplierShell>
  );
}
