import { BusinessDevelopBoard } from "@/components/business-develop/BusinessDevelopBoard";
import { BusinessDevelopShell } from "@/components/business-develop/BusinessDevelopShell";

export const metadata = {
  title: "业务拓展 · 开拓隆海",
  description: "潜在客户开发与监管看板",
};

export default function BusinessDevelopPage() {
  return (
    <BusinessDevelopShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">客户拓展看板</h1>
          <p className="text-sm text-slate-500 mt-1">
            管理潜在客户信息，跟踪从线索到成交的全流程
          </p>
        </div>
        <BusinessDevelopBoard />
      </div>
    </BusinessDevelopShell>
  );
}
