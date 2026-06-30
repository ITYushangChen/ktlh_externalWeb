"use client";

import { useRef, useState } from "react";
import type { WaibaoAttachment } from "@/types/waibao";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface WaibaoAttachmentsProps {
  requirementId: string;
  attachments: WaibaoAttachment[];
  isAdmin: boolean;
  onUpdated: () => void;
  showUpload?: boolean;
}

export function WaibaoAttachments({
  requirementId,
  attachments,
  isAdmin,
  onUpdated,
  showUpload = false,
}: WaibaoAttachmentsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = async (attachmentId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/waibao/attachments/${attachmentId}/download`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      window.open(json.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "下载失败");
    }
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`/api/waibao/requirements/${requirementId}/attachments`, {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
      }
      if (inputRef.current) inputRef.current.value = "";
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (attachmentId: string) => {
    if (!confirm("确定删除该附件？")) return;
    setDeletingId(attachmentId);
    setError(null);
    try {
      const res = await fetch(
        `/api/waibao/requirements/${requirementId}/attachments/${attachmentId}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    } finally {
      setDeletingId(null);
    }
  };

  if (!showUpload && attachments.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-slate-700">附件</div>

      {attachments.length > 0 && (
        <ul className="space-y-1.5">
          {attachments.map((file) => (
            <li
              key={file.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            >
              <button
                type="button"
                className="text-sky-700 hover:underline text-left truncate max-w-[70%]"
                onClick={() => download(file.id)}
              >
                {file.file_name}
              </button>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-400">{formatFileSize(file.file_size)}</span>
                {isAdmin && showUpload && (
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline"
                    disabled={deletingId === file.id}
                    onClick={() => remove(file.id)}
                  >
                    {deletingId === file.id ? "删除中…" : "删除"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {isAdmin && showUpload && (
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300"
            disabled={uploading}
            onChange={(e) => uploadFiles(e.target.files)}
          />
          <p className="text-xs text-slate-400 mt-1">
            支持 PDF、Word、Excel、图片、ZIP、TXT，单个不超过 10MB
          </p>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** 发布需求时预选文件，创建成功后批量上传 */
export function WaibaoPendingFiles({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  return (
    <div>
      <label className="label">附件（可选）</label>
      <input
        type="file"
        multiple
        className="text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-200 file:text-slate-700"
        onChange={(e) => onChange(Array.from(e.target.files ?? []))}
      />
      {files.length > 0 && (
        <ul className="mt-2 text-sm text-slate-500 space-y-1">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              {f.name} ({formatFileSize(f.size)})
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-slate-400 mt-1">发布后将自动上传所选附件</p>
    </div>
  );
}

export async function uploadPendingFiles(requirementId: string, files: File[]) {
  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/waibao/requirements/${requirementId}/attachments`, {
      method: "POST",
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "附件上传失败");
  }
}
