import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { GC_PACKAGES } from "@/lib/stripe";
import { verifyUsdtPayment, USDT_WALLET } from "@/lib/tron";

export async function POST(req: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { txHash, packageId } = await req.json();

    if (!txHash || typeof txHash !== "string") {
      return NextResponse.json({ error: "Missing txHash" }, { status: 400 });
    }
    const pkg = GC_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) return NextResponse.json({ error: "Invalid package" }, { status: 400 });
    if (!USDT_WALLET) {
      return NextResponse.json({ error: "USDT wallet not configured" }, { status: 503 });
    }

    const cleanHash = txHash.trim().replace(/^0x/i, "");
    const gcCredit  = Math.floor(pkg.gc * (1 + pkg.bonus / 100));
    const service   = createServiceClient();

    // ── Idempotency: reject already-used TX hash ──────────────────────────
    const { data: existing } = await service
      .from("gc_transactions")
      .select("id")
      .eq("stripe_session_id", `usdt_${cleanHash}`)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "This transaction has already been used" },
        { status: 409 }
      );
    }

    // ── Verify on-chain ───────────────────────────────────────────────────
    const result = await verifyUsdtPayment(cleanHash, USDT_WALLET, pkg.priceUsdt);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
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

    // ── Log transaction ───────────────────────────────────────────────────
    await service.from("gc_transactions").insert({
      user_id:           user.id,
      type:              "topup",
      amount:            gcCredit,
      note:              `USDT TRC-20 tx ${cleanHash} (${result.actualUsdt} USDT)`,
      stripe_session_id: `usdt_${cleanHash}`,
    });

    return NextResponse.json({ ok: true, gcAmount: gcCredit });
  } catch (err) {
    console.error("[topup/usdt]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
