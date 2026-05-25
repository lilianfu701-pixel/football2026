import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, GC_PACKAGES } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { packageId, locale = "zh" } = await req.json();
    const pkg = GC_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) return NextResponse.json({ error: "Invalid package" }, { status: 400 });

    const totalGc   = Math.floor(pkg.gc * (1 + pkg.bonus / 100));
    const origin    = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const stripe    = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "cny",
            product_data: {
              name: `GoalCoin ${pkg.label}`,
              description:
                pkg.bonus > 0
                  ? `实得 ${(totalGc / 1_000_000).toFixed(0)}M GC（含 +${pkg.bonus}% 赠送）`
                  : `${(totalGc / 1_000_000).toFixed(0)}M GoalCoin`,
            },
            unit_amount: pkg.priceCny * 100, // fen (smallest CNY unit)
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id:    user.id,
        package_id: pkg.id,
        gc_amount:  String(totalGc),
      },
      customer_email: user.email ?? undefined,
      success_url: `${origin}/${locale}/profile/topup/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/${locale}/profile/topup?cancelled=1`,
      expires_at:  Math.floor(Date.now() / 1000) + 30 * 60, // 30 min
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[topup/checkout]", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
