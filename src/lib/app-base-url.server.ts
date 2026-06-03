import { headers } from "next/headers";
import { resolveAppBaseUrl } from "@/lib/env";

/** 服务端解析当前请求的对外根地址（admin 二维码展示用） */
export async function getRequestAppBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto");
  return resolveAppBaseUrl(host, proto);
}
