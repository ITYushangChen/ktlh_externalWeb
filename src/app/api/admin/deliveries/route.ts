import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateDeliveryCode } from "@/lib/delivery";
import { formatApiError } from "@/lib/errors";
import type { DeliveryFormInput } from "@/types/delivery";

function sanitizeContacts(body: DeliveryFormInput) {
  return (body.contacts ?? []).filter(
    (c) => c.name?.trim() && c.phone?.trim()
  );
}

function sanitizeSteps(body: DeliveryFormInput) {
  return (body.steps ?? []).filter((s) => s.title?.trim());
}

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("deliveries")
      .select("id, code, title, supplier_name, status, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ deliveries: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DeliveryFormInput;

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "请填写送货标题" }, { status: 400 });
    }

    const contacts = sanitizeContacts(body);
    if (contacts.length === 0) {
      return NextResponse.json(
        { error: "请至少填写一位联系人的姓名和手机号" },
        { status: 400 }
      );
    }

    const steps = sanitizeSteps(body);
    const supabase = createAdminClient();
    const code = generateDeliveryCode();

    const baseRow = {
      code,
      title: body.title.trim(),
      supplier_name: body.supplier_name?.trim() || null,
      cargo_description: body.cargo_description?.trim() || null,
      notes: body.notes?.trim() || null,
      status: "active" as const,
    };

    const rowWithPicker = {
      ...baseRow,
      picker_label: body.picker_label?.trim() || null,
      list_sort_order: body.list_sort_order ?? 0,
    };

    let insertResult = await supabase
      .from("deliveries")
      .insert(rowWithPicker)
      .select()
      .single();

    if (
      insertResult.error &&
      (insertResult.error.message.includes("picker_label") ||
        insertResult.error.message.includes("list_sort_order"))
    ) {
      insertResult = await supabase
        .from("deliveries")
        .insert(baseRow)
        .select()
        .single();
    }

    const { data: delivery, error: dErr } = insertResult;
    if (dErr || !delivery) throw dErr ?? new Error("创建送货单失败");

    if (steps.length) {
      const { error } = await supabase.from("delivery_steps").insert(
        steps.map((s, i) => ({
          delivery_id: delivery.id,
          sort_order: i,
          title: s.title.trim(),
          description: s.description ?? null,
          location_label: s.location_label ?? null,
        }))
      );
      if (error) throw error;
    }

    if (contacts.length) {
      const { error } = await supabase.from("delivery_contacts").insert(
        contacts.map((c, i) => ({
          delivery_id: delivery.id,
          sort_order: i,
          name: c.name.trim(),
          role: c.role?.trim() ?? null,
          phone: c.phone.trim(),
          wechat: c.wechat ?? null,
          is_primary: c.is_primary ?? i === 0,
        }))
      );
      if (error) throw error;
    }

    if (body.path?.nodes?.length) {
      const { error: nErr } = await supabase.from("path_nodes").insert(
        body.path.nodes.map((n) => ({
          delivery_id: delivery.id,
          node_key: n.node_key,
          label: n.label,
          x: n.x,
          y: n.y,
          z: n.z ?? 0,
          floor: n.floor ?? 1,
          is_destination: n.is_destination ?? false,
          instruction: n.instruction ?? null,
        }))
      );
      if (nErr) throw nErr;

      if (body.path.edges?.length) {
        const { error: eErr } = await supabase.from("path_edges").insert(
          body.path.edges.map((e) => ({
            delivery_id: delivery.id,
            from_key: e.from_key,
            to_key: e.to_key,
          }))
        );
        if (eErr) throw eErr;
      }
    }

    return NextResponse.json({ delivery });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
