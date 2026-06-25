import { createAdminClient } from "@/lib/supabase/admin";
import type { AiProspectAnalysis } from "@/types/lead-crawler";
import { extractDomain } from "./url-utils";

export async function prospectDomainExists(domain: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("business_prospects")
    .select("id")
    .eq("is_active", true)
    .or(`website.ilike.%${domain}%,source_url.ilike.%${domain}%`)
    .limit(1);

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function importProspectFromAnalysis(
  analysis: AiProspectAnalysis,
  url: string,
  keyword: string
): Promise<string> {
  const supabase = createAdminClient();
  const domain = extractDomain(url);

  const { count } = await supabase
    .from("business_prospects")
    .select("*", { count: "exact", head: true })
    .eq("stage", "lead")
    .eq("is_active", true);

  const notes = [
    `[AI 爬虫] 关键词: ${keyword}`,
    `关联度: ${analysis.product_relevance}`,
    `分析: ${analysis.reason}`,
    `置信度: ${(analysis.confidence * 100).toFixed(0)}%`,
  ].join("\n");

  const { data: prospect, error } = await supabase
    .from("business_prospects")
    .insert({
      company_name: analysis.company_name.trim() || domain,
      website: url,
      annual_demand: analysis.annual_demand_estimate?.trim() || "未知",
      location: analysis.location?.trim() || "",
      stage: "lead",
      contact_name: "",
      contact_phone: "",
      notes,
      sort_order: count ?? 0,
      is_active: true,
      source: "crawler",
      source_url: url,
    })
    .select("id")
    .single();

  if (error) throw error;

  const contacts = (analysis.contacts ?? []).filter(
    (c) => c.name || c.phone || c.email
  );

  if (contacts.length > 0) {
    await supabase.from("business_prospect_contacts").insert(
      contacts.map((c, i) => ({
        prospect_id: prospect.id,
        name: c.is_official ? "官方" : c.name.trim(),
        phone: c.phone ?? "",
        email: c.email ?? "",
        sort_order: i,
        is_active: true,
      }))
    );
  }

  return prospect.id;
}
