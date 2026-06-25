import { isSafePublicUrl, normalizeWebsiteUrl } from "./url-utils";

export interface PageContent {
  url: string;
  title: string;
  text: string;
  emails: string[];
  phones: string[];
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.replace(/\s+/g, " ").trim() ?? "";
}

function uniqueStrings(items: string[]): string[] {
  return [...new Set(items.map((s) => s.trim()).filter(Boolean))];
}

function extractEmails(text: string): string[] {
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [];
  return uniqueStrings(
    matches.filter((e) => !e.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i) && !e.includes("example.com"))
  ).slice(0, 8);
}

function extractPhones(text: string): string[] {
  const matches =
    text.match(/(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}(?:[\s-]?\d{2,4})?/g) ?? [];
  return uniqueStrings(matches.filter((p) => p.replace(/\D/g, "").length >= 8)).slice(0, 8);
}

export async function fetchPageContent(url: string): Promise<PageContent> {
  if (!isSafePublicUrl(url)) {
    throw new Error("不允许访问该 URL");
  }

  const res = await fetch(normalizeWebsiteUrl(url), {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; KTLHLeadBot/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15_000),
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`网页请求失败 (${res.status})`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    throw new Error("目标不是 HTML 网页");
  }

  const html = await res.text();
  const text = stripHtml(html).slice(0, 12_000);

  return {
    url: normalizeWebsiteUrl(url),
    title: extractTitle(html),
    text,
    emails: extractEmails(html + " " + text),
    phones: extractPhones(html + " " + text),
  };
}
