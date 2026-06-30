"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { DeliveryNote, PurchaseOrderWithItems } from "@/types/supplier";
import {
  DELIVERY_STATUS_LABELS,
  formatDate,
  formatDateTime,
  formatMoney,
} from "@/lib/supplier-delivery";

export function SupplierOrderDetail({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<PurchaseOrderWithItems | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/suppliers/orders/${orderId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setOrder(json.order);
      setDeliveryNotes(json.deliveryNotes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="text-slate-500 text-center py-12">加载中…</p>;
  if (error || !order) {
    return (
      <div className="card p-6 text-center">
        <p className="text-red-600 mb-4">{error ?? "采购单不存在"}</p>
        <Link href="/suppliers" className="btn btn-secondary">
          返回列表
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link href="/suppliers" className="text-sm text-slate-500 no-underline hover:underline">
            ← 返回采购单列表
          </Link>
          <h1 className="text-2xl font-bold mt-1">{order.order_number}</h1>
        </div>
        <Link
          href={`/suppliers/po/${order.id}/delivery/new`}
          className="btn btn-primary"
        >
          生成送货单
        </Link>
      </div>

      <div className="card p-5 grid sm:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-slate-500">采购日期</p>
          <p className="font-medium">{formatDateTime(order.order_time)}</p>
        </div>
        <div>
          <p className="text-slate-500">预计到达</p>
          <p className="font-medium">{formatDateTime(order.expected_arrival_time)}</p>
        </div>
        <div>
          <p className="text-slate-500">订单状态</p>
          <p className="font-medium">{order.order_status}</p>
        </div>
        <div>
          <p className="text-slate-500">订单金额</p>
          <p className="font-medium">¥{formatMoney(Number(order.order_amount))}</p>
        </div>
        {order.remark && (
          <div className="sm:col-span-2">
            <p className="text-slate-500">备注</p>
            <p className="font-medium">{order.remark}</p>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 font-semibold">采购明细</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-left">
                <th className="px-3 py-2 font-medium">物料</th>
                <th className="px-3 py-2 font-medium">规格</th>
                <th className="px-3 py-2 font-medium">单位</th>
                <th className="px-3 py-2 font-medium text-right">订购</th>
                <th className="px-3 py-2 font-medium text-right">已收</th>
                <th className="px-3 py-2 font-medium text-right">待收</th>
                <th className="px-3 py-2 font-medium text-right">可送</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <div className="font-medium">{item.material_name}</div>
                    {item.material_code && (
                      <div className="text-xs text-slate-400">{item.material_code}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{item.material_spec || "—"}</td>
                  <td className="px-3 py-2">{item.unit}</td>
                  <td className="px-3 py-2 text-right">{item.order_quantity}</td>
                  <td className="px-3 py-2 text-right">{item.received_quantity}</td>
                  <td className="px-3 py-2 text-right text-amber-600">
                    {item.pending_delivery_qty}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-green-700">
                    {item.deliverable_qty}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {deliveryNotes.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 font-semibold">历史送货单</div>
          <div className="divide-y divide-slate-100">
            {deliveryNotes.map((note) => (
              <Link
                key={note.id}
                href={`/suppliers/delivery/${note.id}`}
                className="flex items-center justify-between px-4 py-3 no-underline hover:bg-slate-50"
              >
                <div>
                  <span className="font-medium text-slate-800">{note.delivery_number}</span>
                  <span className="ml-2 text-xs text-slate-500">
                    {formatDate(note.delivery_date)}
                  </span>
                </div>
                <span className="text-sm text-slate-600">
                  {DELIVERY_STATUS_LABELS[note.status] ?? note.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
