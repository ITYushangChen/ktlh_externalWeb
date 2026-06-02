"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Delivery } from "@/types/delivery";

export default function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [delivery, setDelivery] = useState<Delivery | null>(null);

  useEffect(() => {
    fetch(`/api/admin/deliveries/${id}`)
      .then((r) => r.json())
      .then((j) => setDelivery(j.delivery ?? null));
  }, [id]);

  const closeDelivery = async () => {
    if (!confirm("确定关闭？关闭后司机在选货列表中将看不到此货物。")) return;
    await fetch(`/api/admin/deliveries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    const res = await fetch(`/api/admin/deliveries/${id}`);
    const j = await res.json();
    setDelivery(j.delivery);
  };

  if (!delivery) {
    return <p className="text-slate-500">加载中…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{delivery.title}</h1>
        <p className="text-slate-500 text-sm mt-1">
          状态：{delivery.status === "active" ? "进行中" : delivery.status}
        </p>
      </div>

      {delivery.status === "active" && (
        <div className="card p-4 text-sm text-slate-600 space-y-2">
          <p>
            司机使用厂区<strong>固定二维码</strong>进入选货页，选择本条目后查看指引。
          </p>
          <Link
            href={`/s/${delivery.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 font-semibold"
          >
            预览本条指引 →
          </Link>
        </div>
      )}

      {delivery.status === "active" && (
        <button type="button" className="btn btn-secondary" onClick={closeDelivery}>
          标记为已完成（从选货列表移除）
        </button>
      )}
    </div>
  );
}
