"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  WAIBAO_STATUS_COLORS,
  WAIBAO_STATUS_LABELS,
  type WaibaoRequirement,
  type WaibaoRequirementStatus,
  type WaibaoUser,
} from "@/types/waibao";
import {
  WaibaoAttachments,
  WaibaoPendingFiles,
  uploadPendingFiles,
} from "./WaibaoAttachments";

function formatPrice(price: number) {
  return `¥${price.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface WaibaoBoardProps {
  user: WaibaoUser;
}

export function WaibaoBoard({ user }: WaibaoBoardProps) {
  const isAdmin = user.role === "admin";
  const [requirements, setRequirements] = useState<WaibaoRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<WaibaoRequirementStatus | "all">("all");
  const [actionId, setActionId] = useState<string | null>(null);

  const [showCreateReq, setShowCreateReq] = useState(false);
  const [reqTitle, setReqTitle] = useState("");
  const [reqDesc, setReqDesc] = useState("");
  const [reqPrice, setReqPrice] = useState("");
  const [createFiles, setCreateFiles] = useState<File[]>([]);

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editNote, setEditNote] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/waibao/requirements");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setRequirements(json.requirements ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "all") return requirements;
    return requirements.filter((r) => r.status === filter);
  }, [requirements, filter]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: requirements.length };
    for (const r of requirements) {
      map[r.status] = (map[r.status] ?? 0) + 1;
    }
    return map;
  }, [requirements]);

  const runAction = async (id: string, path: string, body?: object) => {
    setActionId(id);
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setActionId(null);
    }
  };

  const createRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionId("create-req");
    setError(null);
    try {
      const res = await fetch("/api/waibao/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: reqTitle,
          description: reqDesc,
          price: Number(reqPrice),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      if (createFiles.length > 0 && json.requirement?.id) {
        await uploadPendingFiles(json.requirement.id, createFiles);
      }

      setReqTitle("");
      setReqDesc("");
      setReqPrice("");
      setCreateFiles([]);
      setShowCreateReq(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "发布失败");
    } finally {
      setActionId(null);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionId("create-user");
    setError(null);
    try {
      const res = await fetch("/api/waibao/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: "user" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setNewUsername("");
      setNewPassword("");
      setShowCreateUser(false);
      alert(`账号 ${json.user.username} 已创建`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建账号失败");
    } finally {
      setActionId(null);
    }
  };

  const cancelRequirement = async (id: string) => {
    if (!confirm("确定取消该需求？")) return;
    setActionId(id);
    setError(null);
    try {
      const res = await fetch(`/api/waibao/requirements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "取消失败");
    } finally {
      setActionId(null);
    }
  };

  const startEdit = (req: WaibaoRequirement) => {
    setEditingId(req.id);
    setEditTitle(req.title);
    setEditDesc(req.description);
    setEditPrice(String(req.price));
    setEditNote(req.admin_note);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDesc("");
    setEditPrice("");
    setEditNote("");
  };

  const saveEdit = async (req: WaibaoRequirement) => {
    setActionId(req.id);
    setError(null);
    try {
      const canEditContent = ["open", "claimed", "submitted"].includes(req.status);
      const body: Record<string, unknown> = { admin_note: editNote };
      if (canEditContent) {
        body.title = editTitle;
        body.description = editDesc;
        body.price = Number(editPrice);
      }

      const res = await fetch(`/api/waibao/requirements/${req.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      cancelEdit();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return <p className="text-slate-500">加载中…</p>;
  }

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCreateReq((v) => !v)}
          >
            {showCreateReq ? "收起" : "+ 发布需求"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowCreateUser((v) => !v)}
          >
            {showCreateUser ? "收起" : "+ 创建账号"}
          </button>
        </div>
      )}

      {showCreateReq && isAdmin && (
        <form onSubmit={createRequirement} className="card p-6 space-y-4">
          <h2 className="font-bold text-lg">发布新需求</h2>
          <div>
            <label className="label">需求标题 *</label>
            <input
              className="input"
              required
              value={reqTitle}
              onChange={(e) => setReqTitle(e.target.value)}
              placeholder="如：业务拓展看板增加导出功能"
            />
          </div>
          <div>
            <label className="label">需求描述</label>
            <textarea
              className="input min-h-[100px]"
              value={reqDesc}
              onChange={(e) => setReqDesc(e.target.value)}
              placeholder="详细说明功能、验收标准等"
            />
          </div>
          <div>
            <label className="label">价格（元）*</label>
            <input
              className="input"
              type="number"
              required
              min={0}
              step={0.01}
              value={reqPrice}
              onChange={(e) => setReqPrice(e.target.value)}
              placeholder="500"
            />
          </div>
          <WaibaoPendingFiles files={createFiles} onChange={setCreateFiles} />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={actionId === "create-req"}
          >
            {actionId === "create-req" ? "发布中…" : "发布需求"}
          </button>
        </form>
      )}

      {showCreateUser && isAdmin && (
        <form onSubmit={createUser} className="card p-6 space-y-4">
          <h2 className="font-bold text-lg">创建普通账号</h2>
          <p className="text-sm text-slate-500">仅管理员可创建账号，新用户可领取并完成需求</p>
          <div>
            <label className="label">账号 *</label>
            <input
              className="input"
              required
              minLength={3}
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="label">密码（至少 8 位）*</label>
            <input
              className="input"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={actionId === "create-user"}
          >
            {actionId === "create-user" ? "创建中…" : "创建账号"}
          </button>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        {(["all", "open", "claimed", "submitted", "completed", "cancelled"] as const).map(
          (key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                filter === key
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {key === "all" ? "全部" : WAIBAO_STATUS_LABELS[key]} ({counts[key] ?? 0})
            </button>
          )
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">暂无需求</div>
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => (
            <article key={req.id} className="card p-6 space-y-3">
              {editingId === req.id ? (
                <div className="space-y-4">
                  <h3 className="font-bold text-lg">编辑需求</h3>
                  {["open", "claimed", "submitted"].includes(req.status) ? (
                    <>
                      <div>
                        <label className="label">需求标题 *</label>
                        <input
                          className="input"
                          required
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="label">需求描述</label>
                        <textarea
                          className="input min-h-[100px]"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="label">价格（元）*</label>
                        <input
                          className="input"
                          type="number"
                          required
                          min={0}
                          step={0.01}
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">
                      该需求已{WAIBAO_STATUS_LABELS[req.status]}，仅可编辑备注
                    </p>
                  )}
                  <div>
                    <label className="label">管理员备注</label>
                    <textarea
                      className="input min-h-[72px]"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="验收说明、驳回原因等"
                    />
                  </div>
                  <WaibaoAttachments
                    requirementId={req.id}
                    attachments={req.attachments ?? []}
                    isAdmin={isAdmin}
                    showUpload
                    onUpdated={load}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-primary text-sm"
                      disabled={actionId === req.id}
                      onClick={() => saveEdit(req)}
                    >
                      {actionId === req.id ? "保存中…" : "保存"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary text-sm"
                      onClick={cancelEdit}
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-lg text-slate-900">{req.title}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${WAIBAO_STATUS_COLORS[req.status]}`}
                    >
                      {WAIBAO_STATUS_LABELS[req.status]}
                    </span>
                  </div>
                  {req.description && (
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{req.description}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-emerald-700">{formatPrice(req.price)}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {req.creator_username && <span>发布：{req.creator_username}</span>}
                {req.claimant_username && <span>领取：{req.claimant_username}</span>}
                {req.claimed_at && <span>领取于 {formatDate(req.claimed_at)}</span>}
                {req.submitted_at && <span>提交于 {formatDate(req.submitted_at)}</span>}
                {req.completed_at && <span>完成于 {formatDate(req.completed_at)}</span>}
              </div>

              {req.admin_note && (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  管理员备注：{req.admin_note}
                </p>
              )}

              <WaibaoAttachments
                requirementId={req.id}
                attachments={req.attachments ?? []}
                isAdmin={isAdmin}
                showUpload={false}
                onUpdated={load}
              />

              <div className="flex flex-wrap gap-2 pt-1">
                {req.status === "open" && (
                  <button
                    type="button"
                    className="btn btn-primary text-sm"
                    disabled={actionId === req.id}
                    onClick={() => runAction(req.id, `/api/waibao/requirements/${req.id}/claim`)}
                  >
                    {actionId === req.id ? "领取中…" : "领取需求"}
                  </button>
                )}

                {req.status === "claimed" && req.claimed_by === user.id && (
                  <button
                    type="button"
                    className="btn btn-primary text-sm"
                    disabled={actionId === req.id}
                    onClick={() => runAction(req.id, `/api/waibao/requirements/${req.id}/submit`)}
                  >
                    {actionId === req.id ? "提交中…" : "标记完成（待管理员确认）"}
                  </button>
                )}

                {isAdmin && req.status === "submitted" && (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary text-sm"
                      disabled={actionId === req.id}
                      onClick={() => runAction(req.id, `/api/waibao/requirements/${req.id}/confirm`)}
                    >
                      {actionId === req.id ? "确认中…" : "确认完成"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary text-sm"
                      disabled={actionId === req.id}
                      onClick={() => {
                        const note = prompt("驳回原因（可选）");
                        runAction(req.id, `/api/waibao/requirements/${req.id}/reject`, {
                          admin_note: note ?? undefined,
                        });
                      }}
                    >
                      驳回重做
                    </button>
                  </>
                )}

                {isAdmin && req.status === "open" && (
                  <button
                    type="button"
                    className="btn btn-secondary text-sm"
                    disabled={actionId === req.id}
                    onClick={() => cancelRequirement(req.id)}
                  >
                    取消需求
                  </button>
                )}

                {isAdmin && (
                  <button
                    type="button"
                    className="btn btn-secondary text-sm"
                    onClick={() => startEdit(req)}
                  >
                    编辑
                  </button>
                )}
              </div>
                </>
              )}
            </article>
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
