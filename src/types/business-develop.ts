export const PROSPECT_STAGES = [
  { id: "lead", label: "潜在线索", color: "bg-slate-100 border-slate-200" },
  { id: "contacted", label: "已联系", color: "bg-sky-50 border-sky-200" },
  { id: "negotiating", label: "洽谈中", color: "bg-amber-50 border-amber-200" },
  { id: "sample", label: "样品/试单", color: "bg-violet-50 border-violet-200" },
  { id: "won", label: "已成交", color: "bg-emerald-50 border-emerald-200" },
  { id: "lost", label: "暂停/流失", color: "bg-rose-50 border-rose-200" },
] as const;

export type ProspectStage = (typeof PROSPECT_STAGES)[number]["id"];

export type EmailScheduleStatus = "pending" | "sent" | "failed" | "cancelled";

export interface EmailSchedule {
  id: string;
  contact_id: string;
  subject: string;
  body: string;
  scheduled_at: string;
  status: EmailScheduleStatus;
  sent_at: string | null;
  error_message: string;
  created_at: string;
}

export interface ProspectContact {
  id: string;
  prospect_id: string;
  name: string;
  phone: string;
  email: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  email_schedules?: EmailSchedule[];
}

export interface BusinessProspect {
  id: string;
  company_name: string;
  website: string;
  annual_demand: string;
  location: string;
  stage: ProspectStage;
  contact_name: string;
  contact_phone: string;
  notes: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  contacts?: ProspectContact[];
}

export interface ContactInput {
  name: string;
  phone?: string;
  email?: string;
  sort_order?: number;
}

export interface EmailScheduleInput {
  subject: string;
  body: string;
  scheduled_at: string;
}

export interface ProspectInput {
  company_name: string;
  website?: string;
  annual_demand?: string;
  location?: string;
  stage?: ProspectStage;
  notes?: string;
  sort_order?: number;
  contacts?: ContactInput[];
}

export interface ProspectMoveInput {
  stage: ProspectStage;
  sort_order: number;
}

export const EMAIL_STATUS_LABELS: Record<EmailScheduleStatus, string> = {
  pending: "待发送",
  sent: "已发送",
  failed: "发送失败",
  cancelled: "已取消",
};
