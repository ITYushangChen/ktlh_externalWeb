"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FixedQRPanel } from "@/components/admin/FixedQRPanel";

interface Row {
  id: string;
  code: string;
  title: string;
  supplier_name: string | null;
  status: string;
  created_at: string;
}

export default function AdminListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/deliveries")
      .then((r) => r.json())
      .then((j) => {
        setRows(j.deliveries ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-8">
      <FixedQRPanel />

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">送货单列表</h1>
        <Link href="/admin/new" className="btn btn-primary no-underline">
          新建送货单
        </Link>
      </div>

      {loading ? (
        <p className="text-slate-500">加载中…</p>
      ) : rows.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          暂无送货单，点击「新建」创建第一个二维码。
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/admin/deliveries/${r.id}`}
                className="card p-4 flex justify-between items-center no-underline text-inherit hover:border-blue-300 transition-colors block"
              >
                <div>
                  <p className="font-semibold">{r.title}</p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {r.code}
                    {r.supplier_name && ` · ${r.supplier_name}`}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    r.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {r.status === "active" ? "进行中" : r.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
