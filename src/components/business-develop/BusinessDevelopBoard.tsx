"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ProspectContactsPanel } from "./ProspectContactsPanel";
import { LocalTimeBadge } from "./LocalTimeBadge";
import {
  PROSPECT_STAGES,
  type BusinessProspect,
  type ContactInput,
  type ProspectInput,
  type ProspectStage,
} from "@/types/business-develop";

const EMPTY_FORM: ProspectInput = {
  company_name: "",
  website: "",
  annual_demand: "",
  location: "",
  stage: "lead",
  notes: "",
  contacts: [{ name: "", phone: "", email: "" }],
};

function groupByStage(prospects: BusinessProspect[]) {
  const map = Object.fromEntries(
    PROSPECT_STAGES.map((s) => [s.id, [] as BusinessProspect[]])
  ) as Record<ProspectStage, BusinessProspect[]>;

  for (const p of prospects) {
    if (map[p.stage]) map[p.stage].push(p);
  }

  for (const stage of PROSPECT_STAGES) {
    map[stage.id].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
  }

  return map;
}

function formatWebsite(url: string) {
  if (!url) return "";
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function contactSummary(prospect: BusinessProspect) {
  const contacts = prospect.contacts ?? [];
  if (contacts.length === 0) {
    if (prospect.contact_name || prospect.contact_phone) {
      return [prospect.contact_name, prospect.contact_phone].filter(Boolean).join(" · ");
    }
    return null;
  }
  if (contacts.length === 1) {
    const c = contacts[0];
    return [c.name, c.phone].filter(Boolean).join(" · ");
  }
  return `${contacts.length} 位联系人 · ${contacts[0].name}${contacts.length > 1 ? " 等" : ""}`;
}

function ProspectCardContent({
  prospect,
  onClick,
  isDragging,
}: {
  prospect: BusinessProspect;
  onClick?: () => void;
  isDragging?: boolean;
}) {
  const summary = contactSummary(prospect);

  return (
    <div
      className={`rounded-lg border bg-white p-3 shadow-sm transition-shadow ${
        isDragging ? "opacity-90 shadow-lg ring-2 ring-sky-300" : "hover:shadow-md"
      } ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm leading-snug flex-1 min-w-0">{prospect.company_name}</p>
        {prospect.location && <LocalTimeBadge location={prospect.location} />}
      </div>
      {prospect.location && (
        <p className="text-xs text-slate-500 mt-1">📍 {prospect.location}</p>
      )}
      {prospect.annual_demand && (
        <p className="text-xs text-slate-600 mt-1">需求量：{prospect.annual_demand}</p>
      )}
      {prospect.website && (
        <p className="text-xs text-blue-600 mt-1 truncate">{formatWebsite(prospect.website)}</p>
      )}
      {summary && (
        <p className="text-xs text-slate-400 mt-2 border-t border-slate-100 pt-2">{summary}</p>
      )}
    </div>
  );
}

function SortableProspectCard({
  prospect,
  onEdit,
}: {
  prospect: BusinessProspect;
  onEdit: (p: BusinessProspect) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: prospect.id,
    data: { type: "prospect", prospect },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ProspectCardContent prospect={prospect} onClick={() => onEdit(prospect)} />
    </div>
  );
}

function KanbanColumn({
  stageId,
  label,
  color,
  prospects,
  onEdit,
}: {
  stageId: ProspectStage;
  label: string;
  color: string;
  prospects: BusinessProspect[];
  onEdit: (p: BusinessProspect) => void;
}) {
  const ids = prospects.map((p) => p.id);
  const { setNodeRef, isOver } = useDroppable({ id: stageId });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 rounded-xl border ${color} flex flex-col max-h-[calc(100vh-280px)] ${
        isOver ? "ring-2 ring-sky-400" : ""
      }`}
    >
      <div className="px-3 py-3 border-b border-inherit flex items-center justify-between">
        <h3 className="font-bold text-sm">{label}</h3>
        <span className="text-xs font-semibold text-slate-500 bg-white/70 px-2 py-0.5 rounded-full">
          {prospects.length}
        </span>
      </div>
      <SortableContext id={stageId} items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]">
          {prospects.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">拖拽卡片到此处</p>
          ) : (
            prospects.map((p) => (
              <SortableProspectCard key={p.id} prospect={p} onEdit={onEdit} />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function ContactRows({
  contacts,
  onChange,
}: {
  contacts: ContactInput[];
  onChange: (contacts: ContactInput[]) => void;
}) {
  const update = (index: number, patch: Partial<ContactInput>) => {
    onChange(contacts.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  return (
    <div className="sm:col-span-2 lg:col-span-3 space-y-2">
      <label className="label">联系人（可添加多位）</label>
      {contacts.map((c, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input
            className="input"
            placeholder="姓名"
            value={c.name}
            onChange={(e) => update(i, { name: e.target.value })}
          />
          <input
            className="input"
            placeholder="电话（选填）"
            type="tel"
            value={c.phone ?? ""}
            onChange={(e) => update(i, { phone: e.target.value })}
          />
          <input
            className="input"
            placeholder="邮箱（选填）"
            type="email"
            value={c.email ?? ""}
            onChange={(e) => update(i, { email: e.target.value })}
          />
          <button
            type="button"
            className="btn btn-secondary text-sm"
            disabled={contacts.length <= 1}
            onClick={() => onChange(contacts.filter((_, j) => j !== i))}
          >
            移除
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-sm text-blue-600 font-semibold"
        onClick={() => onChange([...contacts, { name: "", phone: "", email: "" }])}
      >
        + 再加一位联系人
      </button>
    </div>
  );
}

function EditModal({
  prospect,
  onClose,
  onSave,
  onDelete,
  onRefresh,
  saving,
  onError,
}: {
  prospect: BusinessProspect;
  onClose: () => void;
  onSave: (data: ProspectInput) => Promise<void>;
  onDelete: () => Promise<void>;
  onRefresh: () => Promise<void>;
  saving: boolean;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState<ProspectInput>({
    company_name: prospect.company_name,
    website: prospect.website,
    annual_demand: prospect.annual_demand,
    location: prospect.location,
    stage: prospect.stage,
    notes: prospect.notes,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(form);
  };

  const refreshContacts = async () => {
    await onRefresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">编辑客户</h2>
          <button type="button" className="text-slate-400 hover:text-slate-600 text-xl leading-none" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">客户名称 *</label>
            <input
              className="input"
              required
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">官网</label>
              <input
                className="input"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://"
              />
            </div>
            <div>
              <label className="label">所在地</label>
              <input
                className="input"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="省/市"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">年需求量</label>
              <input
                className="input"
                value={form.annual_demand}
                onChange={(e) => setForm({ ...form, annual_demand: e.target.value })}
                placeholder="如：500 吨/年"
              />
            </div>
            <div>
              <label className="label">开发状态</label>
              <select
                className="input"
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value as ProspectStage })}
              >
                {PROSPECT_STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">备注</label>
            <textarea
              className="input min-h-[80px]"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "保存中…" : "保存基本信息"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              关闭
            </button>
            <button
              type="button"
              className="btn text-red-600 ml-auto"
              disabled={saving}
              onClick={onDelete}
            >
              删除客户
            </button>
          </div>
        </form>

        <ProspectContactsPanel
          prospectId={prospect.id}
          contacts={prospect.contacts ?? []}
          onChanged={refreshContacts}
          onError={onError}
        />
      </div>
    </div>
  );
}

export function BusinessDevelopBoard() {
  const [prospects, setProspects] = useState<BusinessProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProspectInput>(EMPTY_FORM);
  const [editing, setEditing] = useState<BusinessProspect | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const grouped = useMemo(() => groupByStage(prospects), [prospects]);
  const activeProspect = activeId ? prospects.find((p) => p.id === activeId) : null;

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/business-develop/prospects");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const list: BusinessProspect[] = json.prospects ?? [];
      setProspects(list);
      return list;
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
      return [];
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refreshEditing = async () => {
    const list = await load(true);
    if (editing) {
      const updated = list.find((p) => p.id === editing.id);
      if (updated) setEditing(updated);
    }
  };

  const addProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      const contacts = (form.contacts ?? []).filter((c) => c.name?.trim());
      const res = await fetch("/api/business-develop/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, contacts }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "添加失败");
    } finally {
      setAdding(false);
    }
  };

  const saveProspect = async (data: ProspectInput) => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/business-develop/prospects/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await refreshEditing();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const deleteProspect = async () => {
    if (!editing) return;
    if (!confirm(`确定删除「${editing.company_name}」？`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/business-develop/prospects/${editing.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    } finally {
      setSaving(false);
    }
  };

  const findStageForId = (id: string): ProspectStage | null => {
    if (PROSPECT_STAGES.some((s) => s.id === id)) return id as ProspectStage;
    const found = prospects.find((p) => p.id === id);
    return found?.stage ?? null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const prospectId = String(active.id);
    const prospect = prospects.find((p) => p.id === prospectId);
    if (!prospect) return;

    const overStage = findStageForId(String(over.id));
    if (!overStage) return;

    const columnProspects = grouped[overStage].filter((p) => p.id !== prospectId);
    let newSortOrder = columnProspects.length;

    const overProspect = prospects.find((p) => p.id === over.id);
    if (overProspect && overProspect.stage === overStage) {
      newSortOrder = overProspect.sort_order;
    }

    if (prospect.stage === overStage && prospect.sort_order === newSortOrder) return;

    setProspects((prev) =>
      prev.map((p) =>
        p.id === prospectId ? { ...p, stage: overStage, sort_order: newSortOrder } : p
      )
    );

    try {
      const res = await fetch(`/api/business-develop/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: overStage, sort_order: newSortOrder }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "移动失败");
      await load();
    }
  };

  if (loading) {
    return <p className="text-slate-500">加载中…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            共 {prospects.length} 个潜在客户 · 拖拽卡片切换开发状态
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "收起表单" : "+ 新增客户"}
        </button>
      </div>

      {showForm && (
        <section className="card p-6 space-y-4">
          <h2 className="font-bold text-lg">新增潜在客户</h2>
          <form onSubmit={addProspect} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="label">客户名称 *</label>
              <input
                className="input"
                required
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">官网</label>
              <input
                className="input"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://"
              />
            </div>
            <div>
              <label className="label">所在地</label>
              <input
                className="input"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div>
              <label className="label">年需求量</label>
              <input
                className="input"
                value={form.annual_demand}
                onChange={(e) => setForm({ ...form, annual_demand: e.target.value })}
                placeholder="如：500 吨/年"
              />
            </div>
            <div>
              <label className="label">开发状态</label>
              <select
                className="input"
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value as ProspectStage })}
              >
                {PROSPECT_STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <ContactRows
              contacts={form.contacts ?? [{ name: "", phone: "", email: "" }]}
              onChange={(contacts) => setForm({ ...form, contacts })}
            />
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="label">备注</label>
              <textarea
                className="input min-h-[72px]"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <button type="submit" className="btn btn-primary" disabled={adding}>
                {adding ? "添加中…" : "添加到看板"}
              </button>
            </div>
          </form>
        </section>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
          {PROSPECT_STAGES.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stageId={stage.id}
              label={stage.label}
              color={stage.color}
              prospects={grouped[stage.id]}
              onEdit={setEditing}
            />
          ))}
        </div>

        <DragOverlay>
          {activeProspect ? (
            <ProspectCardContent prospect={activeProspect} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>

      {editing && (
        <EditModal
          prospect={editing}
          onClose={() => setEditing(null)}
          onSave={saveProspect}
          onDelete={deleteProspect}
          onRefresh={refreshEditing}
          saving={saving}
          onError={setError}
        />
      )}

      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
