import { NextRequest, NextResponse } from "next/server";
import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { GC_PACKAGES }         from "@/lib/stripe";
import { createNowPayment }    from "@/lib/nowpayments";

// NOWPayments rejects an ipn_callback_url that isn't an absolute public URI
// ("ipn_callback_url must be a valid uri"). NEXT_PUBLIC_SITE_URL may be unset,
// blank, missing the scheme, carry a trailing slash, or point at localhost —
// normalize all of those into a valid https origin so the callback is always valid.
function resolvePublicOrigin(): string {
  const FALLBACK = "https://football2026.net";
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");
  let base = raw;
  if (base && !/^https?:\/\//i.test(base)) base = `https://${base}`;
  if (!base || /\/\/(localhost|127\.0\.0\.1)/i.test(base)) base = FALLBACK;
  try {
    return new URL(base).origin;
  } catch {
    return FALLBACK;
  }
}

export async function POST(req: NextRequest) {
  try {
    // ── Auth ───────────────────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { packageId } = await req.json();
    const pkg = GC_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) return NextResponse.json({ error: "Invalid package" }, { status: 400 });

    const gcAmount = Math.floor(pkg.gc * (1 + pkg.bonus / 100));
    const orderId  = `gc_${user.id}_${Date.now()}`;
    const origin   = resolvePublicOrigin();

    // ── Create NOWPayments order ───────────────────────────────────────────
    const { paymentId, payAddress, payAmount } = await createNowPayment({
      priceUsdt:   pkg.priceUsdt,
      orderId,
      description: `Football2026 GoalCoin ${pkg.label}`,
      callbackUrl: `${origin}/api/webhooks/nowpayments`,
    });

    // ── Persist pending payment ────────────────────────────────────────────
    const service = createServiceClient();
    await service.from("usdt_payments").insert({
      payment_id:  paymentId,
      user_id:     user.id,
      package_id:  packageId,
      gc_amount:   gcAmount,
      price_usdt:  pkg.priceUsdt,
      pay_amount:  payAmount,
      pay_address: payAddress,
      status:      "pending",
    });

    return NextResponse.json({ paymentId, payAddress, payAmount, gcAmount });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[topup/usdt]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
