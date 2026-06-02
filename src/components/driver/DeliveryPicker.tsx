"use client";

import Link from "next/link";
import type { DeliveryListItem } from "@/types/delivery";
import { displayPickerLabel } from "@/lib/delivery";

export function DeliveryPicker({ items }: { items: DeliveryListItem[] }) {
  if (items.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-4xl mb-3">📦</p>
        <p className="font-semibold">暂无可选货物</p>
        <p className="text-sm text-slate-500 mt-2">
          请联系厂区调度人员确认今日送货安排。
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/s/${item.id}`}
            className="card p-4 block no-underline text-inherit active:scale-[0.99] transition-transform hover:border-blue-400"
          >
            <p className="font-bold text-lg text-slate-900">
              {displayPickerLabel(item)}
            </p>
            {item.cargo_description && (
              <p className="text-sm text-slate-600 mt-1">{item.cargo_description}</p>
            )}
            {item.supplier_name && (
              <p className="text-xs text-slate-400 mt-1">供应商：{item.supplier_name}</p>
            )}
            <p className="text-blue-600 text-sm font-semibold mt-3">查看送货指引 →</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
