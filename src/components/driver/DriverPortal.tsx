import Image from "next/image";
import type { PublicGuideData } from "@/types/site";

export function DriverPortal({ data }: { data: PublicGuideData }) {
  return (
    <div className="driver-page min-h-[100dvh] pb-12">
      <header className="driver-hero px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-8">
        <h1 className="driver-hero-title">开拓隆海送货引导</h1>
      </header>

      <div className="px-4 -mt-4 space-y-5 relative z-10">
        {/* 厂区平面图 + 送货流程 */}
        <section className="driver-card overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-0">
            <div className="p-3 bg-white border-b md:border-b-0 md:border-r border-slate-100">
              <h2 className="driver-section-title mb-2 px-1">厂区平面图</h2>
              <div className="relative w-full aspect-[4/5] max-h-[420px] bg-slate-50 rounded-xl overflow-hidden">
                <Image
                  src="/factory-map.png"
                  alt="开拓隆海厂区平面图：北门、过磅、各车间及办公楼位置"
                  fill
                  className="object-contain p-1"
                  sizes="(max-width: 430px) 100vw, 215px"
                  priority
                />
              </div>
            </div>

            <div className="p-4">
              <h2 className="driver-section-title mb-3">送货流程</h2>
              {data.flow_steps.length === 0 ? (
                <p className="text-sm text-slate-500">流程说明待管理员配置</p>
              ) : (
                <ol className="space-y-3">
                  {data.flow_steps.map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="driver-step-num shrink-0 text-sm">
                        {i + 1}
                      </span>
                      <p className="text-[0.9375rem] text-slate-700 leading-relaxed pt-0.5">
                        {step.replace(/^\d+[\.\)、]\s*/, "")}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </section>

        {/* 送货类型与联系人 */}
        <section>
          <h2 className="driver-section-title px-1 mb-3">送货类型与对接人</h2>
          {data.types.length === 0 ? (
            <div className="driver-card p-8 text-center text-sm text-slate-500">
              暂无送货类型，请联系厂区调度
            </div>
          ) : (
            <ul className="space-y-3" role="list">
              {data.types.map((t) => {
                const tel = t.phone.replace(/\s/g, "");
                return (
                  <li key={t.id} className="driver-card p-4">
                    <p className="font-bold text-lg text-slate-900">{t.name}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                      <span>
                        负责人：<strong className="text-slate-800">{t.contact_name}</strong>
                      </span>
                      <span>
                        手机：<strong className="text-slate-800">{t.phone}</strong>
                      </span>
                    </div>
                    <a
                      href={`tel:${tel}`}
                      className="driver-btn-primary mt-4 w-full no-underline text-center"
                    >
                      拨打 {t.contact_name}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
