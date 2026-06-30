"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { PurchaseOrderWithItems } from "@/types/supplier";
import { formatDateTime } from "@/lib/supplier-delivery";

export function SupplierOrderList() {
  const [orders, setOrders] = useState<PurchaseOrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/suppliers/orders");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setOrders(json.orders ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="text-slate-500 text-center py-12">加载中…</p>;
  }

  if (error) {
    return (
      <div className="card p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button type="button" className="btn btn-secondary" onClick={load}>
          重试
        </button>
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="card p-8 text-center text-slate-500">
        <p className="font-medium text-slate-700 mb-1">暂无待送货采购单</p>
        <p className="text-sm">采购单每日凌晨同步，如有疑问请联系采购部</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div key={order.id} className="card p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-lg text-slate-800">{order.order_number}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 font-medium">
                  {order.order_status}
                </span>
              </div>
              <div className="mt-2 text-sm text-slate-500 space-y-0.5">
                <p>采购日期：{formatDateTime(order.order_time)}</p>
                {order.expected_arrival_time && (
                  <p>预计到达：{formatDateTime(order.expected_arrival_time)}</p>
                )}
                <p>
                  明细 {order.items.length} 行 · 可送 {order.deliverable_item_count ?? 0} 行
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href={`/suppliers/po/${order.id}`} className="btn btn-secondary text-sm">
                查看详情
              </Link>
              <Link
                href={`/suppliers/po/${order.id}/delivery/new`}
                className="btn btn-primary text-sm"
              >
                生成送货单
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
