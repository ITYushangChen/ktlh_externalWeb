export type WaibaoUserRole = "admin" | "user";

export type WaibaoRequirementStatus =
  | "open"
  | "claimed"
  | "submitted"
  | "completed"
  | "cancelled";

export interface WaibaoUser {
  id: string;
  username: string;
  role: WaibaoUserRole;
  is_active: boolean;
  created_at: string;
}

export interface WaibaoRequirement {
  id: string;
  title: string;
  description: string;
  price: number;
  status: WaibaoRequirementStatus;
  created_by: string;
  claimed_by: string | null;
  claimed_at: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  admin_note: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  creator_username?: string;
  claimant_username?: string;
  attachments?: WaibaoAttachment[];
}

export interface WaibaoAttachment {
  id: string;
  requirement_id: string;
  file_name: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
}

export interface WaibaoRequirementInput {
  title: string;
  description?: string;
  price: number;
  sort_order?: number;
}

export const WAIBAO_STATUS_LABELS: Record<WaibaoRequirementStatus, string> = {
  open: "待领取",
  claimed: "进行中",
  submitted: "待确认",
  completed: "已完成",
  cancelled: "已取消",
};

export const WAIBAO_STATUS_COLORS: Record<WaibaoRequirementStatus, string> = {
  open: "bg-sky-50 text-sky-800 border-sky-200",
  claimed: "bg-amber-50 text-amber-800 border-amber-200",
  submitted: "bg-violet-50 text-violet-800 border-violet-200",
  completed: "bg-emerald-50 text-emerald-800 border-emerald-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
};
