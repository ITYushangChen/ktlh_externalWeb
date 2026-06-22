import Link from "next/link";
import { DbStatusBanner } from "@/components/admin/DbStatusBanner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/admin" className="font-bold text-slate-800 no-underline">
            开拓隆海 · 管理
          </Link>
          <Link
            href="/business-develop"
            className="text-sm text-blue-600 font-semibold no-underline"
          >
            业务拓展
          </Link>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 font-semibold no-underline"
          >
            预览司机页
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <DbStatusBanner />
        {children}
      </main>
    </div>
  );
}
