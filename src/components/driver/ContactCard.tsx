import type { DeliveryContact } from "@/types/delivery";

export function ContactCard({ contact }: { contact: DeliveryContact }) {
  const tel = contact.phone.replace(/\s/g, "");

  return (
    <div
      className={`driver-card p-5 ${contact.is_primary ? "ring-2 ring-[var(--brand)] ring-offset-2" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-xl text-slate-900">{contact.name}</p>
          {contact.role && (
            <p className="text-sm text-slate-500 mt-0.5">{contact.role}</p>
          )}
        </div>
        {contact.is_primary && (
          <span className="text-xs font-bold bg-[var(--brand-soft)] text-[var(--brand)] px-2.5 py-1 rounded-full shrink-0">
            主联系人
          </span>
        )}
      </div>
      <a
        href={`tel:${tel}`}
        className="driver-btn-primary mt-4 w-full no-underline text-center text-[1.0625rem]"
      >
        📞 拨打 {contact.phone}
      </a>
      {contact.wechat && (
        <p className="text-center text-sm text-slate-500 mt-3">
          微信号：{contact.wechat}
        </p>
      )}
    </div>
  );
}
