import type { DeliveryContact } from "@/types/delivery";

export function ContactCard({ contact }: { contact: DeliveryContact }) {
  const tel = contact.phone.replace(/\s/g, "");

  return (
    <div
      className={`card p-4 ${contact.is_primary ? "ring-2 ring-blue-500" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-lg">{contact.name}</p>
          {contact.role && (
            <p className="text-sm text-slate-500">{contact.role}</p>
          )}
        </div>
        {contact.is_primary && (
          <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full shrink-0">
            主联系人
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={`tel:${tel}`}
          className="btn btn-primary flex-1 min-w-[120px] text-center no-underline"
        >
          拨打电话
        </a>
        {contact.wechat && (
          <span className="btn btn-secondary flex-1 min-w-[120px] text-center text-sm">
            微信：{contact.wechat}
          </span>
        )}
      </div>
    </div>
  );
}
