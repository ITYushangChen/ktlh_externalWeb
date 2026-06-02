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
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/admin" className="font-bold text-slate-800 no-underline">
            送货管理
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin" className="text-slate-600 no-underline hover:text-blue-600">
              列表
            </Link>
            <Link
              href="/admin/new"
              className="text-blue-600 font-semibold no-underline"
            >
              新建
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <DbStatusBanner />
        {children}
      </main>
    </div>
  );
}
