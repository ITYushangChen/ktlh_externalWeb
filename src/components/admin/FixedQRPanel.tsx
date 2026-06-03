"use client";

export function FixedQRPanel({ appUrl }: { appUrl: string }) {
  const url = appUrl;
  const qrSrc = `/api/qr?u=${encodeURIComponent(url)}`;

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    alert("链接已复制");
  };

  return (
    <div className="card p-6">
      <h2 className="font-bold text-lg mb-1">厂区固定二维码</h2>
      <p className="text-sm text-slate-500 mb-6">
        全厂共用一张码。司机扫码后查看厂区平面图、送货流程及各类型对接人电话。
      </p>
      <div className="flex flex-col sm:flex-row gap-6 items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrSrc}
          alt="厂区送货固定二维码"
          width={220}
          height={220}
          className="rounded-lg border border-slate-200 shrink-0"
        />
        <div className="flex-1 text-center sm:text-left space-y-3">
          <p className="text-xs text-slate-500 break-all">{url}</p>
          <div className="flex flex-wrap gap-2">
            <a
              href={qrSrc}
              download="ktlh-delivery-qr.png"
              className="btn btn-primary no-underline text-sm"
            >
              下载 PNG
            </a>
            <button type="button" className="btn btn-secondary text-sm" onClick={copy}>
              复制链接
            </button>
            <a href="/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-sm no-underline">
              预览司机首页
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
