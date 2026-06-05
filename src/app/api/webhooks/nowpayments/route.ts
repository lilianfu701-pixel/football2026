import { NextRequest, NextResponse } from "next/server";
import { createServiceClient }       from "@/lib/supabase/service";
import { verifyNowPaymentsSignature } from "@/lib/nowpayments";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!ipnSecret) {
    console.error("[nowpayments/webhook] NOWPAYMENTS_IPN_SECRET not set");
    return new NextResponse("fail", { status: 500 });
  }

  const body      = await req.text();
  const signature = req.headers.get("x-nowpayments-sig") ?? "";

  if (!verifyNowPaymentsSignature(body, signature, ipnSecret)) {
    console.error("[nowpayments/webhook] Invalid signature");
    return new NextResponse("fail", { status: 401 });
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(body);
  } catch {
    return new NextResponse("fail", { status: 400 });
  }

  // Only process fully confirmed payments
  const paymentStatus = data.payment_status as string;
  if (paymentStatus !== "finished") {
    return new NextResponse("ok");
  }

  const paymentId = data.payment_id as string;
  if (!paymentId) return new NextResponse("ok");

  const service = createServiceClient();

  // ── Look up pending order ─────────────────────────────────────────────
  const { data: payment } = await service
    .from("usdt_payments")
    .select("id, user_id, gc_amount, status")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (!payment) {
    console.error("[nowpayments/webhook] Payment not found:", paymentId);
    return new NextResponse("ok");
  }

  // ── Idempotency ───────────────────────────────────────────────────────
  if (payment.status === "completed") {
    console.log("[nowpayments/webhook] Already processed:", paymentId);
    return new NextResponse("ok");
  }

  // ── Credit GC atomically ──────────────────────────────────────────────
  const { data: newBalance, error } = await service.rpc("gc_credit_atomic", {
    p_user_id: payment.user_id,
    p_amount:  payment.gc_amount,
    p_tx_type: "topup",
    p_desc:    `USDT TRC-20 NOWPayments ${paymentId}`,
  });

  if (error) {
    console.error("[nowpayments/webhook] gc_credit_atomic failed:", error.message);
    return new NextResponse("fail", { status: 500 });
  }

  // ── Mark completed ────────────────────────────────────────────────────
  await service
    .from("usdt_payments")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("payment_id", paymentId);

  // ── Log in gc_transactions (idempotency key = nowpay_{id}) ────────────
  await service.from("gc_transactions").insert({
    user_id:           payment.user_id,
    type:              "topup",
    amount:            payment.gc_amount,
    note:              `USDT TRC-20 NOWPayments ${paymentId}`,
    stripe_session_id: `nowpay_${paymentId}`,
  });

  console.log(`[nowpayments/webhook] Credited ${payment.gc_amount} GC to ${payment.user_id}, balance: ${newBalance}`);
  return new NextResponse("ok");
}
