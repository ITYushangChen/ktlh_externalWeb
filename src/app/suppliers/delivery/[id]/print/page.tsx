import { DeliveryNotePrint } from "@/components/suppliers/DeliveryNotePrint";

export const metadata = {
  title: "打印送货单 · 开拓隆海",
};

export default async function DeliveryPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DeliveryNotePrint noteId={id} />;
}
