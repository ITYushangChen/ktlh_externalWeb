import type { SearchResultItem } from "@/types/lead-crawler";
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

async function searchGoogleCse(query: string, maxResults = 8): Promise<SearchResultItem[]> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY?.trim();
  const cx = process.env.GOOGLE_CSE_CX?.trim();
  if (!apiKey || !cx) return [];

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", query);
  url.searchParams.set("num", String(Math.min(maxResults, 10)));

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    items?: Array<{ link: string; title?: string; snippet?: string }>;
  };

  return (data.items ?? []).map((item) => ({
    url: item.link,
    title: item.title ?? "",
    snippet: item.snippet ?? "",
  }));
}

async function searchDuckDuckGo(query: string, maxResults = 8): Promise<SearchResultItem[]> {
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

  if (!res.ok) return [];

  const html = await res.text();
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

  return results;
}

export async function searchWeb(query: string): Promise<SearchResultItem[]> {
  const google = await searchGoogleCse(query);
  const items = google.length > 0 ? google : await searchDuckDuckGo(query);
  return dedupeResults(items);
}

export function isSearchConfigured(): boolean {
  return Boolean(
    (process.env.GOOGLE_CSE_API_KEY?.trim() && process.env.GOOGLE_CSE_CX?.trim()) ||
      process.env.LEAD_CRAWLER_ALLOW_DDG === "true" ||
      process.env.NODE_ENV === "development"
  );
}
