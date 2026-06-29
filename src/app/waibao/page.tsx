import { WaibaoBoard } from "@/components/waibao/WaibaoBoard";
import { WaibaoShell } from "@/components/waibao/WaibaoShell";
import { requireWaibaoAuth } from "@/lib/waibao-auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "外包需求 · 开拓隆海",
  description: "系统开发外包需求发布与领取",
};

export default async function WaibaoPage() {
  let user;
  try {
    const auth = await requireWaibaoAuth();
    user = auth.user;
  } catch {
    redirect("/waibao/login");
  }

  return (
    <WaibaoShell username={user.username} role={user.role}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">外包需求</h1>
          <p className="text-sm text-slate-500 mt-1">
            浏览系统开发需求，领取任务并完成；管理员发布需求并确认验收
          </p>
        </div>
        <WaibaoBoard user={user} />
      </div>
    </WaibaoShell>
  );
}
