import type { DeliveryStep } from "@/types/delivery";

export function StepsTimeline({ steps }: { steps: DeliveryStep[] }) {
  if (steps.length === 0) {
    return (
      <p className="text-slate-500 text-sm py-6 text-center">暂无流程步骤</p>
    );
  }

  return (
    <ol className="space-y-0">
      {steps.map((step, index) => (
        <li key={step.id} className="flex gap-4">
          <div className="flex flex-col items-center pt-0.5">
            <div className="driver-step-num">{index + 1}</div>
            {index < steps.length - 1 && (
              <div className="w-0.5 flex-1 bg-gradient-to-b from-[var(--brand)]/40 to-[var(--brand)]/10 my-2 min-h-[28px]" />
            )}
          </div>
          <div className={`flex-1 ${index < steps.length - 1 ? "pb-7" : "pb-1"}`}>
            <p className="font-bold text-[1.05rem] text-slate-900 leading-snug">
              {step.title}
            </p>
            {step.location_label && (
              <p className="inline-flex items-center gap-1 text-sm font-medium text-[var(--brand)] mt-2 px-2.5 py-1 rounded-lg bg-[var(--brand-soft)]">
                <span aria-hidden>📍</span>
                {step.location_label}
              </p>
            )}
            {step.description && (
              <p className="text-[0.9375rem] text-slate-600 mt-2 leading-relaxed">
                {step.description}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
