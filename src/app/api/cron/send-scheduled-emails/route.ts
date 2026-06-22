import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatApiError } from "@/lib/errors";
import { isEmailConfigured, sendEmail } from "@/lib/email";

function verifyCronAuth(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV === "development";

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const { data: due, error } = await supabase
      .from("business_prospect_email_schedules")
      .select(
        `
        id,
        subject,
        body,
        scheduled_at,
        contact:business_prospect_contacts!inner(
          id,
          name,
          email,
          is_active
        )
      `
      )
      .eq("status", "pending")
      .lte("scheduled_at", now)
      .limit(20);

    if (error) throw error;

    if (!due?.length) {
      return NextResponse.json({ processed: 0, sent: 0, failed: 0 });
    }

    if (!isEmailConfigured()) {
      const message = "邮件未配置：请设置 SMTP_HOST、SMTP_USER、SMTP_PASS、SMTP_FROM";
      for (const item of due) {
        await supabase
          .from("business_prospect_email_schedules")
          .update({ status: "failed", error_message: message })
          .eq("id", item.id);
      }
      return NextResponse.json({ processed: due.length, sent: 0, failed: due.length, error: message });
    }

    let sent = 0;
    let failed = 0;

    for (const item of due) {
      const raw = item.contact;
      const contact = (Array.isArray(raw) ? raw[0] : raw) as {
        name: string;
        email: string;
        is_active: boolean;
      } | null;

      if (!contact?.is_active || !contact.email?.trim()) {
        await supabase
          .from("business_prospect_email_schedules")
          .update({
            status: "failed",
            error_message: "联系人无效或未填写邮箱",
          })
          .eq("id", item.id);
        failed++;
        continue;
      }

      try {
        await sendEmail({
          to: contact.email.trim(),
          subject: item.subject,
          text: item.body,
        });

        await supabase
          .from("business_prospect_email_schedules")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            error_message: "",
          })
          .eq("id", item.id);
        sent++;
      } catch (e) {
        const message = e instanceof Error ? e.message : "发送失败";
        await supabase
          .from("business_prospect_email_schedules")
          .update({ status: "failed", error_message: message })
          .eq("id", item.id);
        failed++;
      }
    }

    return NextResponse.json({ processed: due.length, sent, failed });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
