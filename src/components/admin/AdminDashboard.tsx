"use client";

import { useCallback, useEffect, useState } from "react";
import { FixedQRPanel } from "./FixedQRPanel";
import type { DeliveryType } from "@/types/site";

export function AdminDashboard() {
  const [flow, setFlow] = useState("");
  const [types, setTypes] = useState<DeliveryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingFlow, setSavingFlow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    contact_name: "",
    phone: "",
    sort_order: 0,
  });
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [settingsRes, typesRes] = await Promise.all([
        fetch("/api/admin/settings"),
        fetch("/api/admin/types"),
      ]);
      const settingsJson = await settingsRes.json();
      const typesJson = await typesRes.json();

      if (!settingsRes.ok) throw new Error(settingsJson.error);
      if (!typesRes.ok) throw new Error(typesJson.error);

      setFlow(settingsJson.settings?.delivery_flow ?? "");
      setTypes(typesJson.types ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveFlow = async () => {
    setSavingFlow(true);
    setError(null);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delivery_flow: flow }),
    });
    const json = await res.json();
    setSavingFlow(false);
    if (!res.ok) {
      setError(json.error ?? "保存失败");
      return;
    }
    alert("送货流程已保存");
  };

  const addType = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    const res = await fetch("/api/admin/types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setAdding(false);
    if (!res.ok) {
      setError(json.error ?? "添加失败");
      return;
    }
    setForm({ name: "", contact_name: "", phone: "", sort_order: 0 });
    await load();
  };

  const removeType = async (id: string, name: string) => {
    if (!confirm(`确定删除「${name}」？司机端将不再显示。`)) return;
    const res = await fetch(`/api/admin/types/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "删除失败");
      return;
    }
    await load();
  };

  if (loading) {
    return <p className="text-slate-500">加载中…</p>;
  }

  return (
    <div className="space-y-8">
      <FixedQRPanel />

      <section className="card p-6 space-y-4">
        <h2 className="font-bold text-lg">送货流程（全类型共用）</h2>
        <p className="text-sm text-slate-500">
          每行一步，司机扫码后在平面图旁显示。例如：从北门进入 → 过磅 → 联系负责人
        </p>
        <textarea
          className="input min-h-[160px] font-mono text-sm leading-relaxed"
          value={flow}
          onChange={(e) => setFlow(e.target.value)}
          placeholder={"1. 从北门进入厂区\n2. 如需过磅请先至过磅处\n3. 联系对应负责人卸货"}
        />
        <button
          type="button"
          className="btn btn-primary"
          disabled={savingFlow}
          onClick={saveFlow}
        >
          {savingFlow ? "保存中…" : "保存送货流程"}
        </button>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="font-bold text-lg">送货类型与对接人</h2>

        <form onSubmit={addType} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl">
          <div>
            <label className="label">送货类型 *</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="如：A车间原料、B车间辅料"
            />
          </div>
          <div>
            <label className="label">接货负责人 *</label>
            <input
              className="input"
              required
              value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">手机号 *</label>
            <input
              className="input"
              required
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="label">排序（越小越靠前）</label>
            <input
              className="input"
              type="number"
              value={form.sort_order}
              onChange={(e) =>
                setForm({ ...form, sort_order: Number(e.target.value) })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={adding}>
              {adding ? "添加中…" : "添加送货类型"}
            </button>
          </div>
        </form>

        {types.filter((t) => t.is_active).length === 0 ? (
          <p className="text-slate-500 text-sm">暂无送货类型</p>
        ) : (
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {types
              .filter((t) => t.is_active)
              .map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white"
                >
                  <div>
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {t.contact_name} · {t.phone}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-red-600 text-sm font-semibold"
                    onClick={() => removeType(t.id, t.name)}
                  >
                    删除
                  </button>
                </li>
              ))}
          </ul>
        )}
      </section>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">
          {error}
        </div>
      )}

      <p className="text-xs text-slate-400">
        厂区平面图使用项目内 public/factory-map.png，更换图片后重新部署即可。
      </p>
    </div>
  );
}
