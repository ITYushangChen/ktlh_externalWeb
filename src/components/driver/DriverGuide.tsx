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
  backHref = "/",
}: {
  data: DeliveryBundle;
  backHref?: string;
}) {
  const { delivery, steps, contacts, nodes, edges } = data;
  const hasPath = nodes.length > 0;
  const [tab, setTab] = useState<Tab>("flow");

  const tabs: { id: Tab; label: string; icon: string; show: boolean }[] = [
    { id: "flow", label: "流程", icon: "📋", show: true },
    { id: "contacts", label: "联系人", icon: "📞", show: contacts.length > 0 },
    { id: "map2d", label: "路线图", icon: "🗺️", show: hasPath },
    { id: "map3d", label: "3D", icon: "📐", show: hasPath },
  ];

  const visibleTabs = tabs.filter((t) => t.show);

  return (
    <div className="driver-page min-h-[100dvh] pb-10">
      <header className="driver-hero px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-10">
        <Link href={backHref} className="driver-back no-underline">
          ← 返回
        </Link>
        <p className="driver-hero-badge mt-4">送货指引</p>
        <h1 className="driver-hero-title text-[1.35rem] leading-tight mt-2">
          {delivery.title}
        </h1>
        {(delivery.cargo_description || delivery.supplier_name) && (
          <div className="mt-3 space-y-1 text-sm text-white/85">
            {delivery.cargo_description && <p>{delivery.cargo_description}</p>}
            {delivery.supplier_name && (
              <p className="text-white/70">供应商：{delivery.supplier_name}</p>
            )}
          </div>
        )}
      </header>

      <div className="px-4 -mt-5 relative z-10">
        <nav
          className="driver-card flex p-1.5 gap-1 overflow-x-auto scrollbar-hide"
          aria-label="内容切换"
        >
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`driver-tab flex-1 min-w-[4.5rem] py-2.5 px-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                tab === t.id ? "driver-tab-active" : "text-slate-600"
              }`}
            >
              <span className="mr-0.5" aria-hidden>
                {t.icon}
              </span>
              {t.label}
            </button>
          ))}
        </nav>

        <section className="mt-4">
          {tab === "flow" && (
            <div className="driver-card p-5">
              <h2 className="driver-section-title">送货流程</h2>
              <p className="text-xs text-slate-500 mb-4">请按顺序完成以下步骤</p>
              <StepsTimeline steps={steps} />
              {delivery.notes && (
                <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200/80 text-sm text-amber-950 leading-relaxed">
                  <span className="font-bold">温馨提示：</span>
                  {delivery.notes}
                </div>
              )}
            </div>
          )}

          {tab === "contacts" && (
            <div className="space-y-3">
              <h2 className="driver-section-title px-1">对接联系人</h2>
              <p className="text-xs text-slate-500 px-1 mb-2">点击下方按钮直接拨号</p>
              {contacts.map((c) => (
                <ContactCard key={c.id} contact={c} />
              ))}
            </div>
          )}

          {tab === "map2d" && hasPath && (
            <div>
              <h2 className="driver-section-title px-1 mb-3">场内路线</h2>
              <PathMap2D nodes={nodes} edges={edges} />
            </div>
          )}

          {tab === "map3d" && hasPath && (
            <div>
              <h2 className="driver-section-title px-1 mb-3">立体路线</h2>
              <p className="text-xs text-slate-500 mb-3 px-1">双指缩放 · 拖动旋转</p>
              <PathMap3D nodes={nodes} edges={edges} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
