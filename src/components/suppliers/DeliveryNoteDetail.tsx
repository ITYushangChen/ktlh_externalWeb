"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DeliveryNoteWithItems } from "@/types/supplier";
import {
  DELIVERY_STATUS_LABELS,
  formatDate,
  formatDateTime,
  formatMoney,
} from "@/lib/supplier-delivery";

export function DeliveryNoteDetail({ noteId }: { noteId: string }) {
  const router = useRouter();
  const [note, setNote] = useState<DeliveryNoteWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
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

  const submitNote = async () => {
    if (!confirm("确认提交送货单？提交后数量不可修改。")) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/suppliers/delivery-notes/${noteId}/submit`, {
      method: "POST",
    });
    setSubmitting(false);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "提交失败");
      return;
    }
    router.refresh();
    load();
  };

  if (loading) return <p className="text-slate-500 text-center py-12">加载中…</p>;
  if (error && !note) {
    return (
      <div className="card p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/suppliers" className="btn btn-secondary">
          返回列表
        </Link>
      </div>
    );
  }
  if (!note) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link
            href={`/suppliers/po/${note.snapshot_order_id}`}
            className="text-sm text-slate-500 no-underline hover:underline"
          >
            ← 返回采购单
          </Link>
          <h1 className="text-2xl font-bold mt-1">{note.delivery_number}</h1>
          <p className="text-sm text-slate-500 mt-1">
            状态：{DELIVERY_STATUS_LABELS[note.status] ?? note.status}
            {note.submitted_at && ` · 提交于 ${formatDateTime(note.submitted_at)}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/suppliers/delivery/${note.id}/print`}
            className="btn btn-secondary"
            target="_blank"
          >
            打印 / PDF
          </Link>
          {note.status === "draft" && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={submitNote}
              disabled={submitting}
            >
              {submitting ? "提交中…" : "提交送货单"}
            </button>
          )}
        </div>
      </div>

      <div className="card p-5 grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
        <div>
          <p className="text-slate-500 mb-1">供方</p>
          <p className="font-medium">{note.supplier_name}</p>
          {note.supplier_address && <p className="text-slate-600">{note.supplier_address}</p>}
          {(note.supplier_contact || note.supplier_phone) && (
            <p className="text-slate-600">
              {[note.supplier_contact, note.supplier_phone].filter(Boolean).join(" / ")}
            </p>
          )}
        </div>
        <div>
          <p className="text-slate-500 mb-1">需方</p>
          <p className="font-medium">{note.buyer_company}</p>
          <p className="text-slate-600">{note.buyer_address}</p>
          {note.buyer_contact && <p className="text-slate-600">联系人：{note.buyer_contact}</p>}
        </div>
        <div>
          <p className="text-slate-500">采购单号</p>
          <p className="font-medium">{note.order_number ?? "—"}</p>
        </div>
        <div>
          <p className="text-slate-500">送货日期</p>
          <p className="font-medium">{formatDate(note.delivery_date)}</p>
        </div>
        {note.expected_arrival_time && (
          <div>
            <p className="text-slate-500">预计到达</p>
            <p className="font-medium">{formatDateTime(note.expected_arrival_time)}</p>
          </div>
        )}
        {(note.vehicle_plate || note.driver_name) && (
          <div>
            <p className="text-slate-500">车辆 / 司机</p>
            <p className="font-medium">
              {[note.vehicle_plate, note.driver_name, note.driver_phone]
                .filter(Boolean)
                .join(" / ")}
            </p>
          </div>
        )}
        {note.remark && (
          <div className="sm:col-span-2">
            <p className="text-slate-500">备注</p>
            <p className="font-medium">{note.remark}</p>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-left">
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">物料编码</th>
                <th className="px-3 py-2 font-medium">物料名称</th>
                <th className="px-3 py-2 font-medium">规格</th>
                <th className="px-3 py-2 font-medium">单位</th>
                <th className="px-3 py-2 font-medium text-right">单价</th>
                <th className="px-3 py-2 font-medium text-right">数量</th>
                <th className="px-3 py-2 font-medium text-right">金额</th>
                <th className="px-3 py-2 font-medium">备注</th>
              </tr>
            </thead>
            <tbody>
              {note.items.map((item, idx) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{idx + 1}</td>
                  <td className="px-3 py-2">{item.material_code || "—"}</td>
                  <td className="px-3 py-2 font-medium">{item.material_name}</td>
                  <td className="px-3 py-2">{item.material_spec || "—"}</td>
                  <td className="px-3 py-2">{item.unit}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(Number(item.unit_price))}</td>
                  <td className="px-3 py-2 text-right font-medium">
                    {item.delivery_quantity}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatMoney(Number(item.unit_price) * Number(item.delivery_quantity))}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{item.line_remark || "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 font-semibold">
                <td colSpan={6} className="px-3 py-3 text-right">
                  合计
                </td>
                <td className="px-3 py-3 text-right">{totals.qty}</td>
                <td className="px-3 py-3 text-right">¥{formatMoney(totals.amount)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
