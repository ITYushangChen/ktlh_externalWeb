import Link from "next/link";

export default function BusinessDevelopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/business-develop" className="font-bold text-slate-800 no-underline">
            开拓隆海 · 业务拓展
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-slate-600 font-semibold no-underline">
              管理后台
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-[1600px] mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
