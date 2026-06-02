"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DeliveryFormInput } from "@/types/delivery";
import { PathEditor } from "./PathEditor";

const emptyForm = (): DeliveryFormInput => ({
  title: "",
  picker_label: "",
  list_sort_order: 0,
  supplier_name: "",
  cargo_description: "",
  notes: "",
  steps: [
    { title: "到达厂区大门", description: "出示二维码", location_label: "大门" },
    { title: "停靠卸货区", description: "按指引停车", location_label: "卸货区" },
    { title: "联系对接人卸货", description: "", location_label: "月台" },
  ],
  contacts: [{ name: "", role: "仓库对接", phone: "", is_primary: true }],
  path: { nodes: [], edges: [] },
});

export function DeliveryForm() {
  const router = useRouter();
  const [form, setForm] = useState<DeliveryFormInput>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPath, setShowPath] = useState(false);

  const updateStep = (i: number, field: string, value: string) => {
    const steps = [...form.steps];
    steps[i] = { ...steps[i], [field]: value };
    setForm({ ...form, steps });
  };

  const updateContact = (i: number, field: string, value: string | boolean) => {
    const contacts = [...form.contacts];
    contacts[i] = { ...contacts[i], [field]: value };
    setForm({ ...form, contacts });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/deliveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "保存失败");
      return;
    }

    router.push(`/admin/deliveries/${json.delivery.id}`);
  };

  return (
    <form onSubmit={submit} className="space-y-8 max-w-2xl">
      <section className="card p-6 space-y-4">
        <h2 className="font-bold text-lg">基本信息</h2>
        <div>
          <label className="label">送货标题 *</label>
          <input
            className="input"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="例如：3月原材料入库 - 华东物流"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">选货页显示名</label>
            <input
              className="input"
              value={form.picker_label ?? ""}
              onChange={(e) => setForm({ ...form, picker_label: e.target.value })}
              placeholder="司机看到的简短名称，如：钢板、化工原料"
            />
          </div>
          <div>
            <label className="label">列表排序（越小越靠前）</label>
            <input
              className="input"
              type="number"
              value={form.list_sort_order ?? 0}
              onChange={(e) =>
                setForm({ ...form, list_sort_order: Number(e.target.value) })
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">供应商</label>
            <input
              className="input"
              value={form.supplier_name}
              onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">货物说明</label>
            <input
              className="input"
              value={form.cargo_description}
              onChange={(e) =>
                setForm({ ...form, cargo_description: e.target.value })
              }
            />
          </div>
        </div>
        <div>
          <label className="label">备注（司机可见）</label>
          <textarea
            className="input min-h-[80px]"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
      </section>

      <section className="card p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-lg">送货流程</h2>
          <button
            type="button"
            className="btn btn-secondary text-sm"
            onClick={() =>
              setForm({
                ...form,
                steps: [...form.steps, { title: "", description: "" }],
              })
            }
          >
            + 步骤
          </button>
        </div>
        {form.steps.map((step, i) => (
          <div key={i} className="border border-slate-200 rounded-lg p-4 space-y-2">
            <input
              className="input"
              required
              placeholder="步骤标题"
              value={step.title}
              onChange={(e) => updateStep(i, "title", e.target.value)}
            />
            <input
              className="input"
              placeholder="位置标签"
              value={step.location_label ?? ""}
              onChange={(e) => updateStep(i, "location_label", e.target.value)}
            />
            <input
              className="input"
              placeholder="详细说明"
              value={step.description ?? ""}
              onChange={(e) => updateStep(i, "description", e.target.value)}
            />
          </div>
        ))}
      </section>

      <section className="card p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-lg">联系人</h2>
          <button
            type="button"
            className="btn btn-secondary text-sm"
            onClick={() =>
              setForm({
                ...form,
                contacts: [...form.contacts, { name: "", phone: "" }],
              })
            }
          >
            + 联系人
          </button>
        </div>
        {form.contacts.map((c, i) => (
          <div key={i} className="grid grid-cols-2 gap-3 border border-slate-200 rounded-lg p-4">
            <div>
              <label className="label">姓名 *</label>
              <input
                className="input"
                required
                value={c.name}
                onChange={(e) => updateContact(i, "name", e.target.value)}
              />
            </div>
            <div>
              <label className="label">职务</label>
              <input
                className="input"
                value={c.role ?? ""}
                onChange={(e) => updateContact(i, "role", e.target.value)}
              />
            </div>
            <div>
              <label className="label">手机 *（必填，否则无法保存）</label>
              <input
                className="input"
                required
                type="tel"
                value={c.phone}
                onChange={(e) => updateContact(i, "phone", e.target.value)}
                placeholder="11 位手机号"
              />
            </div>
            <div>
              <label className="label">微信号</label>
              <input
                className="input"
                value={c.wechat ?? ""}
                onChange={(e) => updateContact(i, "wechat", e.target.value)}
              />
            </div>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={c.is_primary ?? false}
                onChange={(e) => updateContact(i, "is_primary", e.target.checked)}
              />
              设为主联系人
            </label>
          </div>
        ))}
      </section>

      <section className="card p-6 space-y-4">
        <label className="flex items-center gap-2 font-bold text-lg cursor-pointer">
          <input
            type="checkbox"
            checked={showPath}
            onChange={(e) => setShowPath(e.target.checked)}
          />
          配置场内路线（2D / 3D 引导）
        </label>
        {showPath && (
          <PathEditor value={form.path} onChange={(path) => setForm({ ...form, path })} />
        )}
      </section>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm leading-relaxed whitespace-pre-wrap">
          {error}
        </div>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "保存中…" : "保存到选货列表"}
      </button>
    </form>
  );
}
