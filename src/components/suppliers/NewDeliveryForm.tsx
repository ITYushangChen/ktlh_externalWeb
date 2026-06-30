"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CreateDeliveryLineInput, PurchaseOrderWithItems } from "@/types/supplier";
import { todayDateString } from "@/lib/supplier-delivery";

interface LineState {
  selected: boolean;
  delivery_quantity: string;
  line_remark: string;
}

export function NewDeliveryForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<PurchaseOrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deliveryDate, setDeliveryDate] = useState(todayDateString());
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [remark, setRemark] = useState("");
  const [lines, setLines] = useState<Record<string, LineState>>({});

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/suppliers/orders/${orderId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const o = json.order as PurchaseOrderWithItems;
      setOrder(o);

      const initial: Record<string, LineState> = {};
      for (const item of o.items) {
        if (item.deliverable_qty > 0) {
          initial[item.id] = {
            selected: false,
            delivery_quantity: String(item.deliverable_qty),
            line_remark: "",
          };
        }
      }
      setLines(initial);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const deliverableItems = useMemo(
    () => order?.items.filter((i) => i.deliverable_qty > 0) ?? [],
    [order]
  );

  const toggleLine = (itemId: string) => {
    setLines((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], selected: !prev[itemId]?.selected },
    }));
  };

  const updateLine = (itemId: string, patch: Partial<LineState>) => {
    setLines((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], ...patch },
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    const selectedLines: CreateDeliveryLineInput[] = [];
    for (const item of deliverableItems) {
      const state = lines[item.id];
      if (!state?.selected) continue;
      selectedLines.push({
        snapshot_item_id: item.id,
        delivery_quantity: Number(state.delivery_quantity),
        line_remark: state.line_remark || null,
      });
    }

    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/suppliers/delivery-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        snapshot_order_id: order.id,
        delivery_date: deliveryDate,
        expected_arrival_time: order.expected_arrival_time,
        vehicle_plate: vehiclePlate,
        driver_name: driverName,
        driver_phone: driverPhone,
        remark,
        lines: selectedLines,
      }),
    });

    setSubmitting(false);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "创建失败");
      return;
    }

    router.push(`/suppliers/delivery/${json.deliveryNote.id}`);
    router.refresh();
  };

  if (loading) return <p className="text-slate-500 text-center py-12">加载中…</p>;
  if (error && !order) {
    return (
      <div className="card p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/suppliers" className="btn btn-secondary">
          返回列表
        </Link>
      </div>
    );
  }
  if (!order) return null;

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <Link
          href={`/suppliers/po/${order.id}`}
          className="text-sm text-slate-500 no-underline hover:underline"
        >
          ← 返回 {order.order_number}
        </Link>
        <h1 className="text-2xl font-bold mt-1">新建送货单</h1>
      </div>

      <div className="card p-5 grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">送货日期 *</label>
          <input
            className="input"
            type="date"
            required
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label">车牌号</label>
          <input
            className="input"
            value={vehiclePlate}
            onChange={(e) => setVehiclePlate(e.target.value)}
            placeholder="可选"
          />
        </div>
        <div>
          <label className="label">司机姓名</label>
          <input
            className="input"
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
            placeholder="可选"
          />
        </div>
        <div>
          <label className="label">司机电话</label>
          <input
            className="input"
            value={driverPhone}
            onChange={(e) => setDriverPhone(e.target.value)}
            placeholder="可选"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">备注</label>
          <input
            className="input"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="可选"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 font-semibold">
          选择送货物料（勾选并填写本次数量）
        </div>
        {!deliverableItems.length ? (
          <p className="p-4 text-slate-500 text-sm">该采购单暂无可送物料</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-left">
                  <th className="px-3 py-2 w-10" />
                  <th className="px-3 py-2 font-medium">物料</th>
                  <th className="px-3 py-2 font-medium text-right">可送</th>
                  <th className="px-3 py-2 font-medium">本次数量</th>
                  <th className="px-3 py-2 font-medium">行备注</th>
                </tr>
              </thead>
              <tbody>
                {deliverableItems.map((item) => {
                  const state = lines[item.id];
                  return (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={state?.selected ?? false}
                          onChange={() => toggleLine(item.id)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{item.material_name}</div>
                        <div className="text-xs text-slate-400">
                          {[item.material_code, item.material_spec].filter(Boolean).join(" · ")}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {item.deliverable_qty} {item.unit}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="input !py-1.5 !text-sm w-28"
                          type="number"
                          min="0"
                          step="any"
                          disabled={!state?.selected}
                          value={state?.delivery_quantity ?? ""}
                          onChange={(e) =>
                            updateLine(item.id, { delivery_quantity: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="input !py-1.5 !text-sm"
                          disabled={!state?.selected}
                          value={state?.line_remark ?? ""}
                          onChange={(e) => updateLine(item.id, { line_remark: e.target.value })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting || !deliverableItems.length}
        >
          {submitting ? "生成中…" : "生成送货单"}
        </button>
        <Link href={`/suppliers/po/${order.id}`} className="btn btn-secondary">
          取消
        </Link>
      </div>
    </form>
  );
}
