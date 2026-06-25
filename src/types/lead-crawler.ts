export type CrawlJobStatus = "pending" | "searching" | "processing" | "completed" | "failed";
export type CrawlQueueStatus = "pending" | "processing" | "imported" | "skipped" | "failed";

export interface LeadCrawlJob {
  id: string;
  keywords: string[];
  status: CrawlJobStatus;
  total_urls: number;
  processed_urls: number;
  imported_count: number;
  skipped_count: number;
  error_message: string;
  created_at: string;
  updated_at: string;
}

export interface LeadCrawlQueueItem {
  id: string;
  job_id: string;
  keyword: string;
  url: string;
  title: string;
  snippet: string;
  status: CrawlQueueStatus;
  ai_reason: string;
  prospect_id: string | null;
  error_message: string;
  sort_order: number;
  created_at: string;
}

export interface SearchResultItem {
  url: string;
  title: string;
  snippet: string;
}

export interface ExtractedContact {
  name: string;
  phone: string;
  email: string;
  is_official: boolean;
}

export interface AiProspectAnalysis {
  is_prospect: boolean;
  confidence: number;
  company_name: string;
  location: string;
  annual_demand_estimate: string;
  reason: string;
  product_relevance: string;
  contacts: ExtractedContact[];
}
