import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="card max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
          送
        </div>
        <h1 className="text-2xl font-bold mb-2">KTLH 送货引导</h1>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
          厂区固定二维码，司机扫码后选择货物类型，即可查看流程、联系人与路线指引。
        </p>
        <div className="flex flex-col gap-3">
          <Link href="/s" className="btn btn-secondary w-full">
            司机选货页（预览）
          </Link>
          <Link href="/admin" className="btn btn-primary w-full">
            管理后台
          </Link>
        </div>
      </div>
    </main>
  );
}
