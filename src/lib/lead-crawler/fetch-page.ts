import { chromium, type Page } from "playwright";
import { isSafePublicUrl, normalizeWebsiteUrl } from "./url-utils";

export interface PageContent {
  url: string;
  title: string;
  text: string;
  emails: string[];
  phones: string[];
}

const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

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

function isHeadless(): boolean {
  return process.env.LEAD_CRAWLER_HEADLESS !== "false";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function simulateHumanBrowse(page: Page): Promise<void> {
  const scrolls = [450, 720, 520];
  for (const y of scrolls) {
    await page.evaluate((delta) => {
      window.scrollBy(0, delta);
    }, y);
    await delay(300 + Math.floor(Math.random() * 500));
  }
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await delay(200);
}

export async function fetchPageContent(url: string): Promise<PageContent> {
  if (!isSafePublicUrl(url)) {
    throw new Error("不允许访问该 URL");
  }

  const targetUrl = normalizeWebsiteUrl(url);
  const browser = await chromium.launch({ headless: isHeadless() });

  try {
    const context = await browser.newContext({
      userAgent: CHROME_UA,
      viewport: { width: 1366, height: 768 },
      locale: "en-US",
      extraHTTPHeaders: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    const page = await context.newPage();
    page.setDefaultTimeout(20_000);

    const response = await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });

    if (!response) {
      throw new Error("网页无响应");
    }

    const status = response.status();
    if (status >= 400) {
      throw new Error(`网页请求失败 (${status})`);
    }

    try {
      await page.waitForLoadState("networkidle", { timeout: 8_000 });
    } catch {
      // Some sites never go idle; continue after DOM is ready.
    }

    await simulateHumanBrowse(page);

    const finalUrl = page.url();
    const title = (await page.title()).replace(/\s+/g, " ").trim();
    const html = await page.content();

    let text = "";
    try {
      text = await page.locator("body").innerText({ timeout: 5_000 });
    } catch {
      text = "";
    }
    text = text.replace(/\s+/g, " ").trim().slice(0, 12_000);

    const combined = `${html} ${text}`;

    await context.close();

    return {
      url: finalUrl || targetUrl,
      title,
      text,
      emails: extractEmails(combined),
      phones: extractPhones(combined),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "浏览器打开网页失败";
    throw new Error(
      message.includes("Executable doesn't exist")
        ? "未安装 Chromium，请在本机执行：npx playwright install chromium"
        : message
    );
  } finally {
    await browser.close().catch(() => undefined);
  }
}
