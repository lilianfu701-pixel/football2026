import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

// Tell Next.js NOT to parse the body — Stripe needs the raw bytes for signature verification
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    await handleCheckoutCompleted(session);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;

  const { user_id, gc_amount } = session.metadata ?? {};
  if (!user_id || !gc_amount) {
    console.error("[webhook] Missing metadata:", session.id);
    return;
  }

  const supabase = createServiceClient();
  const gcCredit = Number(gc_amount);

  // ── Idempotency: skip if already processed ────────────────────────────────
  const { data: existing } = await supabase
    .from("gc_transactions")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (existing) {
    console.log("[webhook] Already processed:", session.id);
    return;
  }

  // ── Credit GC ─────────────────────────────────────────────────────────────
  const { data: profile, error: fetchErr } = await supabase
    .from("users")
    .select("gc_balance, gc_total")
    .eq("id", user_id)
    .single();

  if (fetchErr || !profile) {
    console.error("[webhook] User not found:", user_id);
    return;
  }

  const newBalance = (profile.gc_balance ?? 0) + gcCredit;
  const newTotal   = (profile.gc_total   ?? 0) + gcCredit;

  const { error: updateErr } = await supabase
    .from("users")
    .update({ gc_balance: newBalance, gc_total: newTotal })
    .eq("id", user_id);

  if (updateErr) {
    console.error("[webhook] Balance update failed:", updateErr);
    return;
  }

  // ── Log transaction ───────────────────────────────────────────────────────
  await supabase.from("gc_transactions").insert({
    user_id,
    type:              "topup",
    amount:            gcCredit,
    note:              `Stripe Checkout ${session.id}`,
    stripe_session_id: session.id,
  });

  console.log(`[webhook] Credited ${gcCredit} GC to user ${user_id}`);
}
