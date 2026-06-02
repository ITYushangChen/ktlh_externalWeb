import type { DeliveryStep } from "@/types/delivery";

export function StepsTimeline({ steps }: { steps: DeliveryStep[] }) {
  if (steps.length === 0) {
    return (
      <p className="text-slate-500 text-sm py-4 text-center">暂无流程步骤</p>
    );
  }

  return (
    <ol className="space-y-0">
      {steps.map((step, index) => (
        <li key={step.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
              {index + 1}
            </div>
            {index < steps.length - 1 && (
              <div className="w-0.5 flex-1 bg-blue-200 my-1 min-h-[24px]" />
            )}
          </div>
          <div className="pb-6 flex-1">
            <p className="font-semibold">{step.title}</p>
            {step.location_label && (
              <p className="text-sm text-blue-600 mt-0.5">📍 {step.location_label}</p>
            )}
            {step.description && (
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                {step.description}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
