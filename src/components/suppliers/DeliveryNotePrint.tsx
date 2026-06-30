"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DeliveryNoteWithItems } from "@/types/supplier";
import { DeliveryNoteQr } from "@/components/suppliers/DeliveryNoteQr";
import { formatDate, formatDateTime, formatMoney } from "@/lib/supplier-delivery";

export function DeliveryNotePrint({ noteId }: { noteId: string }) {
  const [note, setNote] = useState<DeliveryNoteWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/suppliers/delivery-notes/${noteId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setNote(json.deliveryNote);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    if (!note) return { qty: 0, amount: 0 };
    let qty = 0;
    let amount = 0;
    for (const item of note.items) {
      qty += Number(item.delivery_quantity);
      amount += Number(item.unit_price) * Number(item.delivery_quantity);
    }
    return { qty, amount };
  }, [note]);

  if (loading) return <p className="p-8 text-center text-slate-500">加载中…</p>;
  if (error || !note) {
    return <p className="p-8 text-center text-red-600">{error ?? "送货单不存在"}</p>;
  }

  return (
    <div className="print-page bg-white min-h-screen text-slate-900">
      <div className="no-print p-4 text-center border-b border-slate-200">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => window.print()}
        >
          打印 / 另存为 PDF
        </button>
      </div>

      <div className="max-w-[210mm] mx-auto p-8 print:p-6">
        <div className="flex items-start justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold tracking-widest flex-1 text-center pt-2">
            送 货 单
          </h1>
          <div className="shrink-0 text-center">
            <DeliveryNoteQr
              deliveryNumber={note.delivery_number}
              size={88}
              showUrl={false}
            />
            <p className="text-[9px] text-slate-500 mt-1">仓库扫码收货</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 text-sm mb-6">
          <div className="space-y-2">
            <Row label="送货单号" value={note.delivery_number} />
            <Row label="供方单位" value={note.supplier_name} />
            <Row label="供方地址" value={note.supplier_address} />
            <Row
              label="联系人 / 电话"
              value={[note.supplier_contact, note.supplier_phone].filter(Boolean).join(" / ")}
            />
            <Row label="送货日期" value={formatDate(note.delivery_date)} />
            <Row
              label="车牌 / 司机"
              value={[note.vehicle_plate, note.driver_name, note.driver_phone]
                .filter(Boolean)
                .join(" / ")}
            />
          </div>
          <div className="space-y-2">
            <Row label="采购单号" value={note.order_number} />
            <Row label="需方单位" value={note.buyer_company} />
            <Row label="需方地址" value={note.buyer_address} />
            <Row label="联系人" value={note.buyer_contact} />
            <Row label="预计到达" value={formatDateTime(note.expected_arrival_time)} />
          </div>
        </div>

        <table className="w-full text-sm border-collapse mb-6">
          <thead>
            <tr className="border border-slate-400 bg-slate-50">
              <th className="border border-slate-400 px-2 py-1.5 font-medium">序号</th>
              <th className="border border-slate-400 px-2 py-1.5 font-medium">物料编码</th>
              <th className="border border-slate-400 px-2 py-1.5 font-medium">物料名称</th>
              <th className="border border-slate-400 px-2 py-1.5 font-medium">规格</th>
              <th className="border border-slate-400 px-2 py-1.5 font-medium">单位</th>
              <th className="border border-slate-400 px-2 py-1.5 font-medium">单价</th>
              <th className="border border-slate-400 px-2 py-1.5 font-medium">送货数量</th>
              <th className="border border-slate-400 px-2 py-1.5 font-medium">金额</th>
              <th className="border border-slate-400 px-2 py-1.5 font-medium">备注</th>
            </tr>
          </thead>
          <tbody>
            {note.items.map((item, idx) => (
              <tr key={item.id}>
                <td className="border border-slate-400 px-2 py-1.5 text-center">{idx + 1}</td>
                <td className="border border-slate-400 px-2 py-1.5">{item.material_code || ""}</td>
                <td className="border border-slate-400 px-2 py-1.5">{item.material_name}</td>
                <td className="border border-slate-400 px-2 py-1.5">{item.material_spec || ""}</td>
                <td className="border border-slate-400 px-2 py-1.5 text-center">{item.unit}</td>
                <td className="border border-slate-400 px-2 py-1.5 text-right">
                  {formatMoney(Number(item.unit_price))}
                </td>
                <td className="border border-slate-400 px-2 py-1.5 text-right">
                  {item.delivery_quantity}
                </td>
                <td className="border border-slate-400 px-2 py-1.5 text-right">
                  {formatMoney(Number(item.unit_price) * Number(item.delivery_quantity))}
                </td>
                <td className="border border-slate-400 px-2 py-1.5">{item.line_remark || ""}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td colSpan={6} className="border border-slate-400 px-2 py-2 text-right">
                合计
              </td>
              <td className="border border-slate-400 px-2 py-2 text-right">{totals.qty}</td>
              <td className="border border-slate-400 px-2 py-2 text-right">
                ¥{formatMoney(totals.amount)}
              </td>
              <td className="border border-slate-400" />
            </tr>
          </tfoot>
        </table>

        {note.remark && (
          <p className="text-sm mb-8">
            <span className="font-medium">备注：</span>
            {note.remark}
          </p>
        )}

        <div className="grid grid-cols-3 gap-8 text-sm mt-16 pt-4">
          <div>
            送货人签字：________________
          </div>
          <div>
            收货人签字：________________
          </div>
          <div>
            日期：________________
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="text-slate-500 shrink-0 w-24">{label}：</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
