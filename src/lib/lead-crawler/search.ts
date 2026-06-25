import type { KeywordSearchReport, SearchResultItem } from "@/types/lead-crawler";
import { extractDomain, isSafePublicUrl, normalizeWebsiteUrl } from "./url-utils";

const BLOCKED_DOMAINS = new Set([
  "google.com",
  "youtube.com",
  "facebook.com",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "wikipedia.org",
  "amazon.com",
  "alibaba.com",
  "made-in-china.com",
  "reddit.com",
]);

interface ProviderSearchResult {
  items: SearchResultItem[];
  error?: string;
}

function isBlockedResult(url: string): boolean {
  const domain = extractDomain(url);
  return [...BLOCKED_DOMAINS].some((d) => domain === d || domain.endsWith(`.${d}`));
}

function dedupeResults(items: SearchResultItem[]): SearchResultItem[] {
  const seen = new Set<string>();
  const out: SearchResultItem[] = [];
  for (const item of items) {
    if (!isSafePublicUrl(item.url) || isBlockedResult(item.url)) continue;
    const domain = extractDomain(item.url);
    if (seen.has(domain)) continue;
    seen.add(domain);
    out.push({ ...item, url: normalizeWebsiteUrl(item.url) });
  }
  return out;
}

function formatGoogleError(data: unknown, status: number): string {
  const err = data as {
    error?: { message?: string; errors?: Array<{ reason?: string; message?: string }> };
  };
  const msg = err.error?.message?.trim();
  const reason = err.error?.errors?.[0]?.reason;

  if (status === 403 || reason === "dailyLimitExceeded") {
    return `Google API 拒绝访问或配额用尽 (403)：${msg || "请确认已启用 Custom Search API，且 API Key 有效"}`;
  }
  if (status === 400 || reason === "invalid") {
    return `Google API 参数错误 (400)：${msg || "请检查 GOOGLE_CSE_CX 搜索引擎 ID 是否正确"}`;
  }
  if (status === 429) {
    return `Google API 请求过于频繁 (429)：免费版每日约 100 次搜索`;
  }
  return `Google API 错误 (${status})：${msg || "未知错误"}`;
}

function hasGoogleCseConfig(): boolean {
  return Boolean(
    process.env.GOOGLE_CSE_API_KEY?.trim() && process.env.GOOGLE_CSE_CX?.trim()
  );
}

function isDdgAllowed(): boolean {
  return (
    process.env.LEAD_CRAWLER_ALLOW_DDG === "true" ||
    process.env.NODE_ENV === "development"
  );
}

async function searchGoogleCse(
  query: string,
  maxResults = 8
): Promise<ProviderSearchResult> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY?.trim();
  const cx = process.env.GOOGLE_CSE_CX?.trim();
  if (!apiKey || !cx) {
    return { items: [], error: "未配置 GOOGLE_CSE_API_KEY 或 GOOGLE_CSE_CX" };
  }

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", query);
  url.searchParams.set("num", String(Math.min(maxResults, 10)));

  let data: unknown;
  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(12_000) });
    data = await res.json();
    if (!res.ok) {
      return { items: [], error: formatGoogleError(data, res.status) };
    }
  } catch (e) {
    return {
      items: [],
      error: `Google 请求超时或网络失败：${e instanceof Error ? e.message : "未知错误"}`,
    };
  }

  const parsed = data as {
    items?: Array<{ link: string; title?: string; snippet?: string }>;
  };

  const items = (parsed.items ?? []).map((item) => ({
    url: item.link,
    title: item.title ?? "",
    snippet: item.snippet ?? "",
  }));

  if (items.length === 0) {
    return {
      items: [],
      error:
        "Google 返回 0 条结果（请确认 Programmable Search Engine 已开启「搜索整个网络 / Search the entire web」）",
    };
  }

  return { items };
}

async function searchDuckDuckGo(
  query: string,
  maxResults = 8
): Promise<ProviderSearchResult> {
  let html: string;
  try {
    const body = new URLSearchParams({ q: query, kl: "us-en" });
    const res = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (compatible; KTLHLeadBot/1.0)",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      return {
        items: [],
        error: `DuckDuckGo 请求失败 (HTTP ${res.status})，服务器 IP 可能被拦截，建议改用 Google CSE`,
      };
    }
    html = await res.text();
  } catch (e) {
    return {
      items: [],
      error: `DuckDuckGo 请求失败：${e instanceof Error ? e.message : "网络错误"}，建议改用 Google CSE`,
    };
  }

  const results: SearchResultItem[] = [];
  const linkRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

  const links: Array<{ url: string; title: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) !== null && links.length < maxResults) {
    let href = match[1];
    const title = match[2].replace(/<[^>]+>/g, "").trim();
    if (href.includes("uddg=")) {
      const u = new URL(href, "https://duckduckgo.com");
      href = decodeURIComponent(u.searchParams.get("uddg") ?? href);
    }
    links.push({ url: href, title });
  }

  const snippets: string[] = [];
  while ((match = snippetRegex.exec(html)) !== null && snippets.length < maxResults) {
    snippets.push(match[1].replace(/<[^>]+>/g, "").trim());
  }

  for (let i = 0; i < links.length; i++) {
    results.push({
      url: links[i].url,
      title: links[i].title,
      snippet: snippets[i] ?? "",
    });
  }

  if (results.length === 0) {
    return {
      items: [],
      error:
        "DuckDuckGo 返回 0 条结果（Vercel 等服务器环境常被反爬拦截，请配置 Google CSE）",
    };
  }

  return { items: results };
}

export function buildSearchFailureMessage(reports: KeywordSearchReport[]): string {
  const lines = reports.map((r) => {
    const detail = r.message || (r.resultCount > 0 ? `${r.resultCount} 条结果` : "无结果");
    return `• 「${r.keyword}」：${detail}`;
  });

  return [
    "搜索未找到任何可分析的网页：",
    ...lines,
    "",
    "建议：在 Vercel 配置 GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX，并确认搜索引擎开启「搜索整个网络」，然后 Redeploy。",
  ].join("\n");
}

export async function searchWeb(
  query: string
): Promise<{ items: SearchResultItem[]; report: KeywordSearchReport }> {
  const hasGoogle = hasGoogleCseConfig();
  const allowDdg = isDdgAllowed();

  if (hasGoogle) {
    const google = await searchGoogleCse(query);
    if (google.items.length > 0) {
      const items = dedupeResults(google.items);
      return {
        items,
        report: {
          keyword: query,
          resultCount: items.length,
          provider: "google",
        },
      };
    }

    const googleMsg = google.error ?? "Google 无结果";

    if (allowDdg) {
      const ddg = await searchDuckDuckGo(query);
      if (ddg.items.length > 0) {
        const items = dedupeResults(ddg.items);
        return {
          items,
          report: {
            keyword: query,
            resultCount: items.length,
            provider: "duckduckgo",
            message: `Google 未命中，已改用 DuckDuckGo。Google 原因：${googleMsg}`,
          },
        };
      }
      return {
        items: [],
        report: {
          keyword: query,
          resultCount: 0,
          provider: "none",
          message: `Google：${googleMsg}；DuckDuckGo：${ddg.error ?? "无结果"}`,
        },
      };
    }

    return {
      items: [],
      report: {
        keyword: query,
        resultCount: 0,
        provider: "none",
        message: googleMsg,
      },
    };
  }

  if (allowDdg) {
    const ddg = await searchDuckDuckGo(query);
    const items = dedupeResults(ddg.items);
    return {
      items,
      report: {
        keyword: query,
        resultCount: items.length,
        provider: items.length > 0 ? "duckduckgo" : "none",
        message: items.length > 0 ? undefined : ddg.error ?? "DuckDuckGo 无结果",
      },
    };
  }

  return {
    items: [],
    report: {
      keyword: query,
      resultCount: 0,
      provider: "none",
      message: "未配置 Google CSE，且未开启 LEAD_CRAWLER_ALLOW_DDG=true",
    },
  };
}

export function isSearchConfigured(): boolean {
  return hasGoogleCseConfig() || isDdgAllowed();
}

export function getSearchConfigHint(): string {
  if (hasGoogleCseConfig()) {
    return "当前搜索：Google Custom Search";
  }
  if (isDdgAllowed()) {
    return "当前搜索：DuckDuckGo（备用，线上可能不稳定，建议配置 Google CSE）";
  }
  return "未配置搜索";
}
