import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatApiError } from "@/lib/errors";
import { getWaibaoRequirement } from "@/lib/waibao-requirements";
import { assertWaibaoAdminApi } from "@/lib/waibao-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await assertWaibaoAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      price?: number;
      status?: string;
      admin_note?: string;
    };

    const existing = await getWaibaoRequirement(id);
    if (!existing) {
      return NextResponse.json({ error: "需求不存在" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) {
      if (!body.title.trim()) {
        return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
      }
      updates.title = body.title.trim();
    }
    if (body.description !== undefined) updates.description = body.description.trim();
    if (body.price !== undefined) {
      if (Number.isNaN(body.price) || body.price < 0) {
        return NextResponse.json({ error: "价格无效" }, { status: 400 });
      }
      updates.price = body.price;
    }
    if (body.admin_note !== undefined) updates.admin_note = body.admin_note.trim();

    const canEditContent = ["open", "claimed", "submitted"].includes(existing.status);

    if (!canEditContent) {
      delete updates.title;
      delete updates.description;
      delete updates.price;
      if (
        body.title !== undefined ||
        body.description !== undefined ||
        body.price !== undefined
      ) {
        if (existing.status === "completed" || existing.status === "cancelled") {
          return NextResponse.json(
            { error: "已完成或已取消的需求只能编辑备注" },
            { status: 400 }
          );
        }
      }
    }

    if (body.status === "cancelled" && existing.status === "open") {
      updates.status = "cancelled";
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "没有可更新的内容" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("waibao_requirements")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ requirement: { ...data, price: Number(data.price) } });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await assertWaibaoAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const existing = await getWaibaoRequirement(id);
    if (!existing) {
      return NextResponse.json({ error: "需求不存在" }, { status: 404 });
    }
    if (existing.status !== "open" && existing.status !== "cancelled") {
      return NextResponse.json({ error: "只能删除待领取或已取消的需求" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("waibao_requirements").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
