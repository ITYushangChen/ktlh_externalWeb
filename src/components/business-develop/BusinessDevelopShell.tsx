import Link from "next/link";
import { BusinessLogoutButton } from "@/components/business-develop/BusinessLogoutButton";

export function BusinessDevelopShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/business-develop" className="font-bold text-slate-800 no-underline">
            开拓隆海 · 业务拓展
          </Link>
          <BusinessLogoutButton />
        </div>
      </header>
      <main className="max-w-[1600px] mx-auto px-4 py-8">{children}</main>
    </>
  );
}
