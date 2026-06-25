import type { AiProspectAnalysis, SearchResultItem } from "@/types/lead-crawler";
import type { PageContent } from "./fetch-page";

const COMPANY_CONTEXT = `你是浙江开拓隆海（KTLH）的业务开发 AI 助手。公司销售制冷配件与压力容器，包括：
- 储液器（receiver）
- 气液分离器
- 油分离器
- 管路件
- 壳管式换热器

潜在客户类型：空调/制冷设备制造商、热泵厂商、冷库工程商、制冷系统集成商、HVAC OEM、使用或采购上述配件的设备厂。`;

const DEEPSEEK_API_BASE = "https://api.deepseek.com";

export function isAiConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
}

export async function analyzeProspectWithAi(
  search: SearchResultItem,
  page: PageContent
): Promise<AiProspectAnalysis> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("未配置 DEEPSEEK_API_KEY");
  }

  const model = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";
  const apiBase = process.env.DEEPSEEK_API_BASE?.trim() || DEEPSEEK_API_BASE;

  const userContent = JSON.stringify(
    {
      search_title: search.title,
      search_snippet: search.snippet,
      page_url: page.url,
      page_title: page.title,
      page_text_excerpt: page.text.slice(0, 6000),
      extracted_emails: page.emails,
      extracted_phones: page.phones,
    },
    null,
    2
  );

  const res = await fetch(`${apiBase.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `${COMPANY_CONTEXT}

请分析该网页是否代表 KTLH 的潜在客户（可能采购储液器、分离器、换热器等）。
返回 JSON：
{
  "is_prospect": boolean,
  "confidence": 0-1,
  "company_name": "公司名",
  "location": "国家/城市（尽量从网页推断）",
  "annual_demand_estimate": "如无法判断填 未知",
  "reason": "判断理由（中文）",
  "product_relevance": "与本公司产品的关联（中文）",
  "contacts": [
    { "name": "官方", "phone": "", "email": "", "is_official": true }
  ]
}

规则：
- 若是制造商/OEM/制冷设备相关企业且可能用到上述配件，is_prospect=true
- 纯新闻、目录站、招聘、无关 B2B 平台 is_prospect=false
- 官网联系方式 is_official=true 且 name 必须为「官方」
- 有邮箱/电话则填入 contacts，可多条；官网通用联系方式用「官方」
- confidence >= 0.55 才建议 is_prospect=true`,
        },
        { role: "user", content: userContent },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI 分析失败: ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("AI 返回为空");

  const parsed = JSON.parse(raw) as AiProspectAnalysis;

  parsed.contacts = (parsed.contacts ?? []).map((c) => ({
    name: c.is_official ? "官方" : (c.name?.trim() || "联系人"),
    phone: c.phone?.trim() ?? "",
    email: c.email?.trim() ?? "",
    is_official: Boolean(c.is_official),
  }));

  if (page.emails.length && !parsed.contacts.some((c) => c.email)) {
    parsed.contacts.push({
      name: "官方",
      email: page.emails[0],
      phone: page.phones[0] ?? "",
      is_official: true,
    });
  } else if (page.phones.length && !parsed.contacts.some((c) => c.phone)) {
    parsed.contacts.push({
      name: "官方",
      phone: page.phones[0],
      email: page.emails[0] ?? "",
      is_official: true,
    });
  }

  return parsed;
}
