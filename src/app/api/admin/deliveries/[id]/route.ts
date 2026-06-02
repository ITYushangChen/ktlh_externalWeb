import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatApiError } from "@/lib/errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = createAdminClient();
    const { data: delivery, error } = await supabase
      .from("deliveries")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !delivery) {
      return NextResponse.json({ error: "未找到" }, { status: 404 });
    }

    const [steps, contacts, nodes, edges] = await Promise.all([
      supabase
        .from("delivery_steps")
        .select("*")
        .eq("delivery_id", id)
        .order("sort_order"),
      supabase
        .from("delivery_contacts")
        .select("*")
        .eq("delivery_id", id)
        .order("sort_order"),
      supabase.from("path_nodes").select("*").eq("delivery_id", id),
      supabase.from("path_edges").select("*").eq("delivery_id", id),
    ]);

    return NextResponse.json({
      delivery,
      steps: steps.data ?? [],
      contacts: contacts.data ?? [],
      nodes: nodes.data ?? [],
      edges: edges.data ?? [],
    });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    if (body.status) {
      const { error } = await supabase
        .from("deliveries")
        .update({ status: body.status })
        .eq("id", id);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
