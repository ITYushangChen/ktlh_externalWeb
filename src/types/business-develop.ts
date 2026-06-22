export const PROSPECT_STAGES = [
  { id: "lead", label: "潜在线索", color: "bg-slate-100 border-slate-200" },
  { id: "contacted", label: "已联系", color: "bg-sky-50 border-sky-200" },
  { id: "negotiating", label: "洽谈中", color: "bg-amber-50 border-amber-200" },
  { id: "sample", label: "样品/试单", color: "bg-violet-50 border-violet-200" },
  { id: "won", label: "已成交", color: "bg-emerald-50 border-emerald-200" },
  { id: "lost", label: "暂停/流失", color: "bg-rose-50 border-rose-200" },
] as const;

export type ProspectStage = (typeof PROSPECT_STAGES)[number]["id"];

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
}

export interface ProspectInput {
  company_name: string;
  website?: string;
  annual_demand?: string;
  location?: string;
  stage?: ProspectStage;
  contact_name?: string;
  contact_phone?: string;
  notes?: string;
  sort_order?: number;
}

export interface ProspectMoveInput {
  stage: ProspectStage;
  sort_order: number;
}
