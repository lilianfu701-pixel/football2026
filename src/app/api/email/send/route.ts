/**
 * POST /api/email/send
 * Internal API for sending transactional emails.
 * Requires admin auth or valid CRON_SECRET header.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  sendGcAwardedEmail,
  sendPredictionWonEmail,
  sendLevelUpEmail,
  sendWelcomeEmail,
} from "@/lib/email/send";

type EmailType = "gc_awarded" | "prediction_won" | "level_up" | "welcome";

export async function POST(req: NextRequest) {
  // Allow cron jobs with secret
  const cronSecret = req.headers.get("x-cron-secret");
  let isAuthed = cronSecret === process.env.CRON_SECRET;

  // Otherwise require admin session
  if (!isAuthed) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: me } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
      isAuthed = !!me?.is_admin;
    }
  }

  if (!isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as {
    type: EmailType;
    to: string;
    [key: string]: unknown;
  };

  try {
    let result;
    switch (body.type) {
      case "gc_awarded":
        result = await sendGcAwardedEmail({
          to:         body.to,
          nickname:   body.nickname as string,
          amount:     body.amount as number,
          newBalance: body.newBalance as number,
          reason:     body.reason as string,
          locale:     body.locale as string | undefined,
        });
        break;
      case "prediction_won":
        result = await sendPredictionWonEmail({
          to:         body.to,
          nickname:   body.nickname as string,
          matchTitle: body.matchTitle as string,
          prediction: body.prediction as string,
          gcWon:      body.gcWon as number,
          locale:     body.locale as string | undefined,
        });
        break;
      case "level_up":
        result = await sendLevelUpEmail({
          to:        body.to,
          nickname:  body.nickname as string,
          newLevel:  body.newLevel as number,
          levelName: body.levelName as string,
          locale:    body.locale as string | undefined,
        });
        break;
      case "welcome":
        result = await sendWelcomeEmail(body.to, body.nickname as string, body.locale as string | undefined);
        break;
      default:
        return NextResponse.json({ error: "Unknown email type" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, id: (result as { data?: { id?: string } })?.data?.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
