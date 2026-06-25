import { NextResponse } from "next/server";
import { assertBusinessAuthApi } from "@/lib/business-auth";
import { formatApiError } from "@/lib/errors";
import { isAiConfigured } from "@/lib/lead-crawler/ai-analyze";
import { createCrawlJob } from "@/lib/lead-crawler/run-job";
import { isSearchConfigured } from "@/lib/lead-crawler/search";

export async function POST(request: Request) {
  const auth = await assertBusinessAuthApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as { keywords?: string[] | string };

    const keywords = (Array.isArray(body.keywords) ? body.keywords : (body.keywords ?? "").split("\n"))
      .map((k) => k.trim())
      .filter(Boolean);

    if (keywords.length === 0) {
      return NextResponse.json({ error: "请至少输入一个搜索关键词" }, { status: 400 });
    }

    if (keywords.length > 10) {
      return NextResponse.json({ error: "单次最多 10 个关键词" }, { status: 400 });
    }

    if (!isSearchConfigured()) {
      return NextResponse.json(
        {
          error:
            "未配置搜索：请在环境变量中设置 GOOGLE_CSE_API_KEY 与 GOOGLE_CSE_CX，或开启 LEAD_CRAWLER_ALLOW_DDG=true",
        },
        { status: 503 }
      );
    }

    if (!isAiConfigured()) {
      return NextResponse.json(
        { error: "未配置 DEEPSEEK_API_KEY，无法进行 AI 潜客分析" },
        { status: 503 }
      );
    }

    const result = await createCrawlJob(keywords);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
