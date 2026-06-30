import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WaibaoAttachment } from "@/types/waibao";

export const WAIBAO_BUCKET = "waibao-attachments";
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
]);

function sanitizeFileName(name: string): string {
  const base = name.replace(/[/\\?%*:|"<>]/g, "_").trim();
  return base.slice(0, 180) || "file";
}

export function validateAttachmentFile(file: File): string | null {
  if (file.size <= 0) return "文件为空";
  if (file.size > MAX_ATTACHMENT_BYTES) return "单个附件不能超过 10MB";
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    return "不支持的文件类型（支持 PDF、Word、Excel、图片、ZIP、TXT）";
  }
  return null;
}

export async function uploadWaibaoAttachment(
  requirementId: string,
  file: File,
  userId: string
): Promise<WaibaoAttachment> {
  const validationError = validateAttachmentFile(file);
  if (validationError) throw new Error(validationError);

  const supabase = createAdminClient();
  const safeName = sanitizeFileName(file.name);
  const storagePath = `${requirementId}/${randomUUID()}_${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(WAIBAO_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    if (uploadError.message.toLowerCase().includes("bucket")) {
      throw new Error(
        "Storage 桶 waibao-attachments 未创建，请在 Supabase Dashboard → Storage 创建私有桶，或执行 010_waibao_attachments.sql"
      );
    }
    throw uploadError;
  }

  const { data, error } = await supabase
    .from("waibao_attachments")
    .insert({
      requirement_id: requirementId,
      file_name: safeName,
      storage_path: storagePath,
      file_size: file.size,
      mime_type: file.type || "application/octet-stream",
      uploaded_by: userId,
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(WAIBAO_BUCKET).remove([storagePath]);
    throw error;
  }

  return { ...data, file_size: Number(data.file_size) };
}

export async function getWaibaoAttachment(id: string): Promise<WaibaoAttachment | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("waibao_attachments")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return { ...data, file_size: Number(data.file_size) };
}

export async function deleteWaibaoAttachment(id: string): Promise<void> {
  const supabase = createAdminClient();
  const attachment = await getWaibaoAttachment(id);
  if (!attachment) throw new Error("附件不存在");

  const { error: dbError } = await supabase.from("waibao_attachments").delete().eq("id", id);
  if (dbError) throw dbError;

  await supabase.storage.from(WAIBAO_BUCKET).remove([attachment.storage_path]);
}

export async function createAttachmentDownloadUrl(
  attachmentId: string,
  expiresInSeconds = 3600
): Promise<string> {
  const attachment = await getWaibaoAttachment(attachmentId);
  if (!attachment) throw new Error("附件不存在");

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(WAIBAO_BUCKET)
    .createSignedUrl(attachment.storage_path, expiresInSeconds, {
      download: attachment.file_name,
    });

  if (error) throw error;
  if (!data?.signedUrl) throw new Error("无法生成下载链接");
  return data.signedUrl;
}
