"use client";

import Link from "next/link";
import { useState } from "react";
import type { DeliveryBundle } from "@/types/delivery";
import { ContactCard } from "./ContactCard";
import { StepsTimeline } from "./StepsTimeline";
import { PathMap2D } from "./PathMap2D";
import { PathMap3D } from "./PathMap3D";

type Tab = "flow" | "contacts" | "map2d" | "map3d";

export function DriverGuide({
  data,
  backHref = "/s",
}: {
  data: DeliveryBundle;
  backHref?: string;
}) {
  const { delivery, steps, contacts, nodes, edges } = data;
  const hasPath = nodes.length > 0;
  const [tab, setTab] = useState<Tab>("flow");

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "flow", label: "流程", show: true },
    { id: "contacts", label: "联系人", show: contacts.length > 0 },
    { id: "map2d", label: "平面图", show: hasPath },
    { id: "map3d", label: "3D", show: hasPath },
  ];

  return (
    <div className="min-h-screen pb-8">
      <header className="bg-blue-600 text-white px-4 pt-6 pb-8 rounded-b-3xl shadow-lg">
        <Link
          href={backHref}
          className="text-blue-100 text-sm mb-3 inline-block no-underline hover:text-white"
        >
          ← 重新选择货物
        </Link>
        <h1 className="text-2xl font-bold mt-1">{delivery.title}</h1>
        {delivery.supplier_name && (
          <p className="text-blue-100 text-sm mt-2">供应商：{delivery.supplier_name}</p>
        )}
        {delivery.cargo_description && (
          <p className="text-white/90 text-sm mt-1">货物：{delivery.cargo_description}</p>
        )}
      </header>

      <div className="px-4 -mt-4">
        <nav className="card flex p-1 gap-1 overflow-x-auto">
          {tabs
            .filter((t) => t.show)
            .map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex-1 min-w-[4rem] py-2 px-3 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                  tab === t.id
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t.label}
              </button>
            ))}
        </nav>

        <section className="mt-4">
          {tab === "flow" && (
            <div className="card p-4">
              <h2 className="font-bold mb-4">送货流程</h2>
              <StepsTimeline steps={steps} />
              {delivery.notes && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
                  <strong>备注：</strong>
                  {delivery.notes}
                </div>
              )}
            </div>
          )}

          {tab === "contacts" && (
            <div className="space-y-3">
              <h2 className="font-bold px-1">请联系以下人员</h2>
              {contacts.map((c) => (
                <ContactCard key={c.id} contact={c} />
              ))}
            </div>
          )}

          {tab === "map2d" && hasPath && (
            <div>
              <h2 className="font-bold mb-3 px-1">场内路线（平面图）</h2>
              <p className="text-xs text-slate-500 mb-3 px-1">
                点击节点或使用「上一步 / 下一步」按顺序行进
              </p>
              <PathMap2D nodes={nodes} edges={edges} />
            </div>
          )}

          {tab === "map3d" && hasPath && (
            <div>
              <h2 className="font-bold mb-3 px-1">场内路线（3D）</h2>
              <p className="text-xs text-slate-500 mb-3 px-1">
                拖动旋转视角，双指缩放
              </p>
              <PathMap3D nodes={nodes} edges={edges} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
