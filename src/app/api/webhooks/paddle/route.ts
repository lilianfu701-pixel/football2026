import { NextRequest, NextResponse } from "next/server";
import { createServiceClient }       from "@/lib/supabase/service";
import { createHmac }                from "crypto";

export const runtime = "nodejs";

/** Verify Paddle webhook signature (HMAC-SHA256) */
function verifySignature(body: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  // Paddle header format: ts=xxx;h1=xxx
  const parts = Object.fromEntries(header.split(";").map((p) => p.split("=")));
  const ts    = parts["ts"];
  const h1    = parts["h1"];
  if (!ts || !h1) return false;

  const signed = createHmac("sha256", secret)
    .update(`${ts}:${body}`)
    .digest("hex");

  return signed === h1;
}

export async function POST(req: NextRequest) {
  const body   = await req.text();
  const header = req.headers.get("paddle-signature");
  const secret = process.env.PADDLE_WEBHOOK_SECRET;

  if (!secret) {
    console.error("[paddle/webhook] PADDLE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  if (!verifySignature(body, header, secret)) {
    console.error("[paddle/webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event_type: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only handle completed transactions
  if (event.event_type !== "transaction.completed") {
    return NextResponse.json({ received: true });
  }

  const tx         = event.data;
  const txId       = tx.id as string;
  const customData = (tx.custom_data ?? {}) as Record<string, string>;
  const userId     = customData.user_id;
  const gcAmount   = Number(customData.gc_amount ?? 0);

  if (!userId || !gcAmount) {
    console.error("[paddle/webhook] Missing custom_data:", txId);
    return NextResponse.json({ received: true });
  }

  const service = createServiceClient();

  // ── Idempotency ────────────────────────────────────────────────────────────
  const { data: existing } = await service
    .from("gc_transactions")
    .select("id")
    .eq("stripe_session_id", `paddle_${txId}`)
    .maybeSingle();

  if (existing) {
    console.log("[paddle/webhook] Already processed:", txId);
    return NextResponse.json({ received: true });
  }

  // ── Credit GC ──────────────────────────────────────────────────────────────
  const { data: newBalance, error } = await service.rpc("gc_credit_atomic", {
    p_user_id: userId,
    p_amount:  gcAmount,
    p_tx_type: "topup",
    p_desc:    `Paddle transaction ${txId}`,
  });

  if (error) {
    console.error("[paddle/webhook] gc_credit_atomic failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Log in gc_transactions for idempotency ─────────────────────────────────
  await service.from("gc_transactions").insert({
    user_id:           userId,
    type:              "topup",
    amount:            gcAmount,
    note:              `Paddle ${txId}`,
    stripe_session_id: `paddle_${txId}`,
  });

  console.log(`[paddle/webhook] Credited ${gcAmount} GC to ${userId}, new balance: ${newBalance}`);
  return NextResponse.json({ received: true });
}
