import { buildDeliveryNoteQrUrl } from "@/lib/supplier-qr";

interface DeliveryNoteQrProps {
  deliveryNumber: string;
  size?: number;
  showUrl?: boolean;
  className?: string;
}

export function DeliveryNoteQr({
  deliveryNumber,
  size = 96,
  showUrl = true,
  className = "",
}: DeliveryNoteQrProps) {
  const qrUrl = buildDeliveryNoteQrUrl(deliveryNumber);
  const imgSrc = `/api/suppliers/qr?dn=${encodeURIComponent(deliveryNumber)}`;

  return (
    <div className={`text-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt={`送货单 ${deliveryNumber} 收货二维码`}
        width={size}
        height={size}
        className="inline-block"
      />
      {showUrl && (
        <p className="text-[10px] text-slate-500 mt-1 break-all leading-tight max-w-[140px] mx-auto">
          扫码收货
          <br />
          {qrUrl}
        </p>
      )}
    </div>
  );
}
