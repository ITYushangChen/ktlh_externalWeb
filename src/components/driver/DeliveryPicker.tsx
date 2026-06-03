"use client";

import Link from "next/link";
import type { DeliveryListItem } from "@/types/delivery";
import { displayPickerLabel } from "@/lib/delivery";

export function DeliveryPicker({ items }: { items: DeliveryListItem[] }) {
  if (items.length === 0) {
    return (
      <div className="driver-card p-8 text-center">
        <div className="text-5xl mb-3" aria-hidden>
          📋
        </div>
        <p className="font-bold text-lg text-slate-800">今日暂无可选送货类型</p>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          请联系厂区调度确认安排
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3" role="list">
      {items.map((item, index) => (
        <li key={item.id}>
          <Link
            href={`/guide/${item.id}`}
            className="driver-type-card group block no-underline text-inherit"
          >
            <div className="flex items-center gap-4">
              <div className="driver-type-index" aria-hidden>
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[1.125rem] text-slate-900 leading-snug">
                  {displayPickerLabel(item)}
                </p>
                {item.cargo_description && (
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                    {item.cargo_description}
                  </p>
                )}
                {item.supplier_name && (
                  <p className="text-xs text-slate-400 mt-1.5">
                    {item.supplier_name}
                  </p>
                )}
              </div>
              <span className="driver-chevron" aria-hidden>
                ›
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
