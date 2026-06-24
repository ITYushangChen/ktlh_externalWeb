"use client";

import { useRef, useState } from "react";
import {
  EMAIL_STATUS_LABELS,
  type ContactCommunicationLog,
  type EmailSchedule,
  type ProspectContact,
} from "@/types/business-develop";
import { formatRelativeTime } from "@/lib/format-relative-time";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDatetimeLocalValue(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return d.toISOString().slice(0, 16);
}

function statusBadgeClass(status: EmailSchedule["status"]) {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-800";
    case "sent":
      return "bg-emerald-100 text-emerald-800";
    case "failed":
      return "bg-red-100 text-red-800";
    case "cancelled":
      return "bg-slate-100 text-slate-600";
  }
}

function getLatestLog(logs: ContactCommunicationLog[]): ContactCommunicationLog | null {
  if (!logs.length) return null;
  return logs.reduce((a, b) => (a.contacted_at >= b.contacted_at ? a : b));
}

function LastContactBadge({ logs }: { logs: ContactCommunicationLog[] }) {
  const latest = getLatestLog(logs);
  if (!latest) {
    return (
      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-semibold">
        尚未联系
      </span>
    );
  }

  return (
    <span
      className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
        latest.has_replied ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
      }`}
      title={`上次联系：${formatDateTime(latest.contacted_at)}`}
    >
      {formatRelativeTime(latest.contacted_at)}联系
      {latest.has_replied ? " · 已回复" : " · 待回复"}
    </span>
  );
}

function ContactCard({
  contact,
  onChanged,
  onError,
}: {
  contact: ProspectContact;
  onChanged: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(contact.name);
  const [phone, setPhone] = useState(contact.phone);
  const [email, setEmail] = useState(contact.email);
  const [busy, setBusy] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState(toDatetimeLocalValue());
  const [logSubject, setLogSubject] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [logContactedAt, setLogContactedAt] = useState(toDatetimeLocalValue());
  const [logHasReplied, setLogHasReplied] = useState(false);
  const submittingLogRef = useRef(false);

  const schedules = contact.email_schedules ?? [];
  const logs = contact.communication_logs ?? [];

  const saveContact = async () => {
    if (!name.trim()) {
      onError("请填写联系人姓名");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/business-develop/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setEditing(false);
      await onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  };

  const removeContact = async () => {
    if (!confirm(`确定删除联系人「${contact.name}」？`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/business-develop/contacts/${contact.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "删除失败");
    } finally {
      setBusy(false);
    }
  };

  const addLog = async () => {
    if (submittingLogRef.current || busy) return;
    if (!logSubject.trim()) {
      onError("请填写联络事项");
      return;
    }

    submittingLogRef.current = true;
    setBusy(true);
    try {
      const res = await fetch(`/api/business-develop/contacts/${contact.id}/communications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: logSubject,
          notes: logNotes,
          contacted_at: new Date(logContactedAt).toISOString(),
          has_replied: logHasReplied,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setLogSubject("");
      setLogNotes("");
      setLogContactedAt(toDatetimeLocalValue());
      setLogHasReplied(false);
      setShowLogForm(false);
      await onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "添加联络记录失败");
    } finally {
      submittingLogRef.current = false;
      setBusy(false);
    }
  };

  const toggleReplied = async (log: ContactCommunicationLog) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/business-develop/communications/${log.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ has_replied: !log.has_replied }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "更新失败");
    } finally {
      setBusy(false);
    }
  };

  const removeLog = async (log: ContactCommunicationLog) => {
    if (!confirm(`确定删除联络记录「${log.subject}」？`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/business-develop/communications/${log.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "删除失败");
    } finally {
      setBusy(false);
    }
  };

  const scheduleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      onError("请先为联系人填写邮箱");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/business-develop/contacts/${contact.id}/emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          body,
          scheduled_at: new Date(scheduledAt).toISOString(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSubject("");
      setBody("");
      setScheduledAt(toDatetimeLocalValue());
      setShowScheduleForm(false);
      await onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "创建定时邮件失败");
    } finally {
      setBusy(false);
    }
  };

  const cancelSchedule = async (scheduleId: string) => {
    if (!confirm("确定取消这封待发送邮件？")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/business-develop/emails/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "取消失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      {editing ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            className="input"
            placeholder="姓名 *"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input"
            placeholder="电话"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            className="input"
            placeholder="邮箱"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="sm:col-span-3 flex gap-2">
            <button type="button" className="btn btn-primary text-sm py-1.5" disabled={busy} onClick={saveContact}>
              保存
            </button>
            <button type="button" className="btn btn-secondary text-sm py-1.5" onClick={() => setEditing(false)}>
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-sm">{contact.name}</p>
              <LastContactBadge logs={logs} />
            </div>
            <p className="text-xs text-slate-500">
              {[phone && `📞 ${phone}`, email && `✉️ ${email}`].filter(Boolean).join(" · ") || "未填写联系方式"}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button type="button" className="text-xs text-blue-600 font-semibold" onClick={() => setEditing(true)}>
              编辑
            </button>
            <button type="button" className="text-xs text-red-600 font-semibold" disabled={busy} onClick={removeContact}>
              删除
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-slate-200 pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-600">联络记录</p>
          <button
            type="button"
            className="text-xs text-blue-600 font-semibold"
            onClick={() => setShowLogForm((v) => !v)}
          >
            {showLogForm ? "收起" : "+ 新增联络"}
          </button>
        </div>

        {showLogForm && (
          <div className="space-y-2 bg-white rounded-lg p-3 border border-slate-200">
            <input
              className="input text-sm"
              placeholder="联络事项 *"
              value={logSubject}
              onChange={(e) => setLogSubject(e.target.value)}
            />
            <textarea
              className="input text-sm min-h-[60px]"
              placeholder="备注（选填）"
              value={logNotes}
              onChange={(e) => setLogNotes(e.target.value)}
            />
            <div>
              <label className="label text-xs">联系时间</label>
              <input
                className="input text-sm"
                type="datetime-local"
                value={logContactedAt}
                onChange={(e) => setLogContactedAt(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={logHasReplied}
                onChange={(e) => setLogHasReplied(e.target.checked)}
              />
              对方已回复
            </label>
            <button type="button" className="btn btn-primary text-sm py-1.5" disabled={busy} onClick={addLog}>
              {busy ? "保存中…" : "保存联络记录"}
            </button>
          </div>
        )}

        {logs.length === 0 ? (
          <p className="text-xs text-slate-400">暂无联络记录</p>
        ) : (
          <ul className="space-y-2">
            {logs.map((log) => (
              <li key={log.id} className="bg-white rounded-lg p-2.5 border border-slate-200 text-xs">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{log.subject}</p>
                    <p className="text-slate-500 mt-0.5">{formatDateTime(log.contacted_at)}</p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => toggleReplied(log)}
                    className={`px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                      log.has_replied
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {log.has_replied ? "已回复" : "未回复"}
                  </button>
                </div>
                {log.notes && (
                  <p className="text-slate-600 mt-1 whitespace-pre-wrap">{log.notes}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-slate-400">{formatRelativeTime(log.contacted_at)}</span>
                  <button
                    type="button"
                    className="text-red-600 font-semibold"
                    disabled={busy}
                    onClick={() => removeLog(log)}
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-slate-200 pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-600">定时邮件</p>
          <button
            type="button"
            className="text-xs text-blue-600 font-semibold"
            onClick={() => setShowScheduleForm((v) => !v)}
            disabled={!email.trim()}
            title={!email.trim() ? "请先填写邮箱" : undefined}
          >
            {showScheduleForm ? "收起" : "+ 新建定时邮件"}
          </button>
        </div>

        {showScheduleForm && (
          <form onSubmit={scheduleEmail} className="space-y-2 bg-white rounded-lg p-3 border border-slate-200">
            <input
              className="input text-sm"
              placeholder="邮件主题 *"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <textarea
              className="input text-sm min-h-[72px]"
              placeholder="邮件正文 *"
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div>
              <label className="label text-xs">发送时间 *</label>
              <input
                className="input text-sm"
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary text-sm py-1.5" disabled={busy}>
              {busy ? "提交中…" : "创建定时发送"}
            </button>
          </form>
        )}

        {schedules.length === 0 ? (
          <p className="text-xs text-slate-400">暂无定时邮件</p>
        ) : (
          <ul className="space-y-2">
            {schedules.map((s) => (
              <li key={s.id} className="bg-white rounded-lg p-2.5 border border-slate-200 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{s.subject}</span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${statusBadgeClass(s.status)}`}>
                    {EMAIL_STATUS_LABELS[s.status]}
                  </span>
                </div>
                <p className="text-slate-500 mt-1">计划：{formatDateTime(s.scheduled_at)}</p>
                {s.sent_at && <p className="text-emerald-600 mt-0.5">已发：{formatDateTime(s.sent_at)}</p>}
                {s.error_message && <p className="text-red-600 mt-0.5">{s.error_message}</p>}
                <p className="text-slate-600 mt-1 line-clamp-2 whitespace-pre-wrap">{s.body}</p>
                {s.status === "pending" && (
                  <button
                    type="button"
                    className="text-red-600 font-semibold mt-2"
                    disabled={busy}
                    onClick={() => cancelSchedule(s.id)}
                  >
                    取消发送
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function ProspectContactsPanel({
  prospectId,
  contacts,
  onChanged,
  onError,
}: {
  prospectId: string;
  contacts: ProspectContact[];
  onChanged: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const submittingRef = useRef(false);

  const addContact = async () => {
    if (submittingRef.current || adding) return;
    if (!name.trim()) {
      onError("请填写联系人姓名");
      return;
    }

    submittingRef.current = true;
    setAdding(true);
    try {
      const res = await fetch(`/api/business-develop/prospects/${prospectId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setName("");
      setPhone("");
      setEmail("");
      await onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "添加联系人失败");
    } finally {
      submittingRef.current = false;
      setAdding(false);
    }
  };

  return (
    <div className="space-y-3 border-t border-slate-200 pt-4">
      <h3 className="font-bold text-sm">联系人（{contacts.length}）</h3>

      {contacts.map((c) => (
        <ContactCard
          key={c.id}
          contact={c}
          onChanged={onChanged}
          onError={onError}
        />
      ))}

      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
            e.preventDefault();
            void addContact();
          }
        }}
      >
        <input
          className="input text-sm"
          placeholder="姓名 *"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input text-sm"
          placeholder="电话（选填）"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          className="input text-sm"
          placeholder="邮箱（选填，定时邮件需填）"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="sm:col-span-3">
          <button type="button" className="btn btn-secondary text-sm py-1.5" disabled={adding} onClick={addContact}>
            {adding ? "添加中…" : "+ 添加联系人"}
          </button>
        </div>
      </div>
    </div>
  );
}
