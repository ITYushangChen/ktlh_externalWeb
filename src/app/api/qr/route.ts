import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getAppBaseUrl } from "@/lib/env";

/** 固定厂区二维码（所有司机共用） */
export async function GET() {
  const url = getAppBaseUrl();

  try {
    const png = await QRCode.toBuffer(url, {
      type: "png",
      width: 512,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    });

    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "生成二维码失败" }, { status: 500 });
  }
}
