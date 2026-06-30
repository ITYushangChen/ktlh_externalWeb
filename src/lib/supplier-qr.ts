/** 内网收货地址（送货单二维码指向此处，仓库扫码入库） */
export function getInternalReceiveBaseUrl(): string {
  const configured =
    process.env.INTERNAL_RECEIVE_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_INTERNAL_RECEIVE_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return "http://10.88.161.250";
}

/** 送货单二维码内容：内网链接 + 送货单号 */
export function buildDeliveryNoteQrUrl(deliveryNumber: string): string {
  const base = getInternalReceiveBaseUrl();
  const params = new URLSearchParams({ delivery_number: deliveryNumber });
  return `${base}/?${params.toString()}`;
}
