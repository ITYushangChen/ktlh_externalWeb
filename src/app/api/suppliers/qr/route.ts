import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import QRCode from "qrcode";
import { buildDeliveryNoteQrUrl } from "@/lib/supplier-qr";

/** 送货单收货二维码 PNG */
export async function GET(request: NextRequest) {
  const dn =
    request.nextUrl.searchParams.get("dn")?.trim() ||
    request.nextUrl.searchParams.get("delivery_number")?.trim();

  if (!dn) {
    return NextResponse.json({ error: "缺少送货单号 dn" }, { status: 400 });
  }

  const url = buildDeliveryNoteQrUrl(dn);

  try {
    const png = await QRCode.toBuffer(url, {
      type: "png",
      width: 160,
      margin: 1,
      errorCorrectionLevel: "M",
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
