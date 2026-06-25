import { createAdminClient } from "@/lib/supabase/admin";
import type { KeywordSearchReport } from "@/types/lead-crawler";
import { analyzeProspectWithAi } from "./ai-analyze";
import { fetchPageContent } from "./fetch-page";
import { importProspectFromAnalysis, prospectDomainExists } from "./import-prospect";
import { buildSearchFailureMessage, searchWeb } from "./search";
import { extractDomain } from "./url-utils";

export async function createCrawlJob(keywords: string[]) {
  const supabase = createAdminClient();

  const { data: job, error } = await supabase
    .from("business_lead_crawl_jobs")
    .insert({
      keywords,
      status: "searching",
    })
    .select("*")
    .single();

  if (error) throw error;

  try {
    const allItems: Array<{ keyword: string; url: string; title: string; snippet: string; sort_order: number }> = [];
    const searchReports: KeywordSearchReport[] = [];
    let order = 0;

    for (const keyword of keywords) {
      const { items, report } = await searchWeb(keyword);
      searchReports.push(report);
      for (const r of items) {
        allItems.push({
          keyword,
          url: r.url,
          title: r.title,
          snippet: r.snippet,
          sort_order: order++,
        });
      }
    }

    const seenDomains = new Set<string>();
    const queueRows = allItems.filter((item) => {
      const domain = extractDomain(item.url);
      if (seenDomains.has(domain)) return false;
      seenDomains.add(domain);
      return true;
    });

    if (queueRows.length > 0) {
      const { error: queueError } = await supabase.from("business_lead_crawl_queue").insert(
        queueRows.map((row) => ({
          job_id: job.id,
          keyword: row.keyword,
          url: row.url,
          title: row.title,
          snippet: row.snippet,
          sort_order: row.sort_order,
          status: "pending",
        }))
      );
      if (queueError) throw queueError;
    }

    if (queueRows.length === 0) {
      const errorMessage = buildSearchFailureMessage(searchReports);
      await supabase
        .from("business_lead_crawl_jobs")
        .update({
          status: "failed",
          total_urls: 0,
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      return { jobId: job.id, totalUrls: 0, searchReports, searchSummary: errorMessage };
    }

    const status = "processing";
    await supabase
      .from("business_lead_crawl_jobs")
      .update({
        status,
        total_urls: queueRows.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return { jobId: job.id, totalUrls: queueRows.length, searchReports };
  } catch (e) {
    await supabase
      .from("business_lead_crawl_jobs")
      .update({
        status: "failed",
        error_message: e instanceof Error ? e.message : "搜索失败",
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    throw e;
  }
}

export async function processCrawlBatch(jobId: string, batchSize = 1) {
  const supabase = createAdminClient();

  const { data: job, error: jobError } = await supabase
    .from("business_lead_crawl_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobError) throw jobError;

  const { data: pending, error: pendingError } = await supabase
    .from("business_lead_crawl_queue")
    .select("*")
    .eq("job_id", jobId)
    .eq("status", "pending")
    .order("sort_order")
    .limit(batchSize);

  if (pendingError) throw pendingError;

  if (!pending?.length) {
    await supabase
      .from("business_lead_crawl_jobs")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", jobId);
    return { done: true, processed: 0, imported: 0, skipped: 0 };
  }

  let imported = 0;
  let skipped = 0;

  for (const item of pending) {
    await supabase
      .from("business_lead_crawl_queue")
      .update({ status: "processing" })
      .eq("id", item.id);

    try {
      const domain = extractDomain(item.url);
      if (await prospectDomainExists(domain)) {
        await supabase
          .from("business_lead_crawl_queue")
          .update({
            status: "skipped",
            ai_reason: "看板中已存在同域名客户",
          })
          .eq("id", item.id);
        skipped++;
        continue;
      }

      const page = await fetchPageContent(item.url);
      const analysis = await analyzeProspectWithAi(
        { url: item.url, title: item.title, snippet: item.snippet },
        page
      );

      if (!analysis.is_prospect || analysis.confidence < 0.55) {
        await supabase
          .from("business_lead_crawl_queue")
          .update({
            status: "skipped",
            ai_reason: analysis.reason || "AI 判定为非潜在客户",
          })
          .eq("id", item.id);
        skipped++;
        continue;
      }

      const prospectId = await importProspectFromAnalysis(
        analysis,
        item.url,
        item.keyword
      );

      await supabase
        .from("business_lead_crawl_queue")
        .update({
          status: "imported",
          ai_reason: analysis.reason,
          prospect_id: prospectId,
        })
        .eq("id", item.id);
      imported++;
    } catch (e) {
      await supabase
        .from("business_lead_crawl_queue")
        .update({
          status: "failed",
          error_message: e instanceof Error ? e.message : "处理失败",
        })
        .eq("id", item.id);
    }
  }

  const { count: remaining } = await supabase
    .from("business_lead_crawl_queue")
    .select("*", { count: "exact", head: true })
    .eq("job_id", jobId)
    .eq("status", "pending");

  const newProcessed = job.processed_urls + pending.length;
  const newImported = job.imported_count + imported;
  const newSkipped = job.skipped_count + skipped;
  const done = (remaining ?? 0) === 0;

  await supabase
    .from("business_lead_crawl_jobs")
    .update({
      processed_urls: newProcessed,
      imported_count: newImported,
      skipped_count: newSkipped,
      status: done ? "completed" : "processing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  return { done, processed: pending.length, imported, skipped };
}

export async function getCrawlJob(jobId: string) {
  const supabase = createAdminClient();
  const { data: job, error } = await supabase
    .from("business_lead_crawl_jobs")
    .select("*")
    .eq("id", jobId)
    .single();
  if (error) throw error;

  const { data: recent } = await supabase
    .from("business_lead_crawl_queue")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(20);

  return { job, recent: recent ?? [] };
}
