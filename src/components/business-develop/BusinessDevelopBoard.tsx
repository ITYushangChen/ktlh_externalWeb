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
import {
  PROSPECT_STAGES,
  type BusinessProspect,
  type ProspectInput,
  type ProspectStage,
} from "@/types/business-develop";

const EMPTY_FORM: ProspectInput = {
  company_name: "",
  website: "",
  annual_demand: "",
  location: "",
  stage: "lead",
  contact_name: "",
  contact_phone: "",
  notes: "",
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

function ProspectCardContent({
  prospect,
  onClick,
  isDragging,
}: {
  prospect: BusinessProspect;
  onClick?: () => void;
  isDragging?: boolean;
}) {
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
      <p className="font-semibold text-sm leading-snug">{prospect.company_name}</p>
      {prospect.location && (
        <p className="text-xs text-slate-500 mt-1">📍 {prospect.location}</p>
      )}
      {prospect.annual_demand && (
        <p className="text-xs text-slate-600 mt-1">需求量：{prospect.annual_demand}</p>
      )}
      {prospect.website && (
        <p className="text-xs text-blue-600 mt-1 truncate">{formatWebsite(prospect.website)}</p>
      )}
      {(prospect.contact_name || prospect.contact_phone) && (
        <p className="text-xs text-slate-400 mt-2 border-t border-slate-100 pt-2">
          {[prospect.contact_name, prospect.contact_phone].filter(Boolean).join(" · ")}
        </p>
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

function EditModal({
  prospect,
  onClose,
  onSave,
  onDelete,
  saving,
}: {
  prospect: BusinessProspect;
  onClose: () => void;
  onSave: (data: ProspectInput) => Promise<void>;
  onDelete: () => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState<ProspectInput>({
    company_name: prospect.company_name,
    website: prospect.website,
    annual_demand: prospect.annual_demand,
    location: prospect.location,
    stage: prospect.stage,
    contact_name: prospect.contact_name,
    contact_phone: prospect.contact_phone,
    notes: prospect.notes,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">联系人</label>
              <input
                className="input"
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">联系电话</label>
              <input
                className="input"
                type="tel"
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              />
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
              {saving ? "保存中…" : "保存"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button
              type="button"
              className="btn text-red-600 ml-auto"
              disabled={saving}
              onClick={onDelete}
            >
              删除
            </button>
          </div>
        </form>
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/business-develop/prospects");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setProspects(json.prospects ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/business-develop/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
      setEditing(null);
      await load();
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
            <div>
              <label className="label">联系人</label>
              <input
                className="input"
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">联系电话</label>
              <input
                className="input"
                type="tel"
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              />
            </div>
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
          saving={saving}
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
