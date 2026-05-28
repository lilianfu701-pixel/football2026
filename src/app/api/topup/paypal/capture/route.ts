import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { GC_PACKAGES } from "@/lib/stripe";
import { capturePayPalOrder } from "@/lib/paypal";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { orderID, packageId } = await req.json();
    if (!orderID || !packageId) {
      return NextResponse.json({ error: "Missing orderID or packageId" }, { status: 400 });
    }

    const pkg = GC_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) return NextResponse.json({ error: "Invalid package" }, { status: 400 });

    // ── Capture the PayPal payment ────────────────────────────────────────
    const { status, captureId, currency, value } = await capturePayPalOrder(orderID);
    if (status !== "COMPLETED") {
      return NextResponse.json({ error: `Payment not completed: ${status}` }, { status: 400 });
    }
    if (currency !== "USD" || Math.round(value * 100) !== Math.round(pkg.priceUsdt * 100)) {
      return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 });
    }

    const service  = createServiceClient();
    const gcCredit = Math.floor(pkg.gc * (1 + pkg.bonus / 100));
    const txNote   = `PayPal capture ${captureId}`;

    // ── Idempotency guard ─────────────────────────────────────────────────
    const { data: existing } = await service
      .from("gc_transactions")
      .select("id")
      .eq("stripe_session_id", `paypal_${captureId}`)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, gcAmount: gcCredit, alreadyCredited: true });
    }

    // ── Credit GC ─────────────────────────────────────────────────────────
    const { data: profile } = await service
      .from("users")
      .select("gc_balance, gc_total")
      .eq("id", user.id)
      .single();

    if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await service.from("users").update({
      gc_balance: (profile.gc_balance ?? 0) + gcCredit,
      gc_total:   (profile.gc_total   ?? 0) + gcCredit,
    }).eq("id", user.id);

    // ── Log transaction (reusing stripe_session_id column for the capture ID) ──
    await service.from("gc_transactions").insert({
      user_id:           user.id,
      type:              "topup",
      amount:            gcCredit,
      note:              txNote,
      stripe_session_id: `paypal_${captureId}`,  // prefixed to avoid collision with Stripe IDs
    });

    return NextResponse.json({ ok: true, gcAmount: gcCredit });
  } catch (err) {
    console.error("[paypal/capture]", err);
    return NextResponse.json({ error: "Capture failed" }, { status: 500 });
  }
}
