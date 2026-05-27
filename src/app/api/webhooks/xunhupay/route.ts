import { NextRequest, NextResponse } from "next/server";
import { createServiceClient }       from "@/lib/supabase/service";
import { verifyWebhook }             from "@/lib/xunhupay";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const appSecret = process.env.XUNHUPAY_APPSECRET;
  if (!appSecret) {
    console.error("[xunhupay/webhook] XUNHUPAY_APPSECRET not set");
    return new NextResponse("fail", { status: 500 });
  }

  // 虎皮椒 sends application/x-www-form-urlencoded
  const text   = await req.text();
  const params = Object.fromEntries(new URLSearchParams(text)) as Record<string, string>;

  if (!verifyWebhook(params, appSecret)) {
    console.error("[xunhupay/webhook] Invalid signature, params:", JSON.stringify(params));
    return new NextResponse("fail", { status: 401 });
  }

  // Only handle "OD" = paid
  if (params.status !== "OD") {
    return new NextResponse("success");
  }

  const tradeId = params.trade_order_id; // gc_{timestamp}_{random}
  if (!tradeId) {
    console.error("[xunhupay/webhook] Missing trade_order_id");
    return new NextResponse("success");
  }

  const service = createServiceClient();

  // ── Idempotency: check if already credited ─────────────────────────────
  const { data: done } = await service
    .from("gc_transactions")
    .select("id")
    .eq("stripe_session_id", `xunhu_${tradeId}`)
    .maybeSingle();

  if (done) {
    console.log("[xunhupay/webhook] Already processed:", tradeId);
    return new NextResponse("success");
  }

  // ── Look up pending order to get userId + gcAmount ─────────────────────
  const { data: pending } = await service
    .from("gc_transactions")
    .select("id, user_id, amount")
    .eq("stripe_session_id", `xunhu_pending_${tradeId}`)
    .maybeSingle();

  if (!pending) {
    console.error("[xunhupay/webhook] Pending order not found for:", tradeId);
    return new NextResponse("success");
  }

  const { user_id: userId, amount: gcAmount } = pending;

  // ── Credit GC atomically ───────────────────────────────────────────────
  const { data: newBalance, error } = await service.rpc("gc_credit_atomic", {
    p_user_id: userId,
    p_amount:  gcAmount,
    p_tx_type: "topup",
    p_desc:    `虎皮椒 ${tradeId}`,
  });

  if (error) {
    console.error("[xunhupay/webhook] gc_credit_atomic failed:", error.message);
    return new NextResponse("fail", { status: 500 });
  }

  // ── Log completed transaction + mark pending as processed ─────────────
  await service.from("gc_transactions").insert({
    user_id:           userId,
    type:              "topup",
    amount:            gcAmount,
    note:              `虎皮椒 ${tradeId}`,
    stripe_session_id: `xunhu_${tradeId}`,
  });

  // Delete the pending record
  await service
    .from("gc_transactions")
    .delete()
    .eq("id", pending.id);

  console.log(`[xunhupay/webhook] Credited ${gcAmount} GC to ${userId}, balance: ${newBalance}`);
  return new NextResponse("success");
}
