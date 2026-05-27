import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, GC_PACKAGES } from "@/lib/stripe";

function checkoutOrigin(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  const fallback = configured ?? "http://localhost:3000";
  const requestOrigin = req.headers.get("origin");

  if (!requestOrigin) return fallback;

  try {
    const requestUrl = new URL(requestOrigin);
    const allowed = new Set(
      [configured, "http://localhost:3000"]
        .filter(Boolean)
        .map((origin) => new URL(origin!).origin),
    );
    return allowed.has(requestUrl.origin) ? requestUrl.origin : fallback;
  } catch {
    return fallback;
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured (missing STRIPE_SECRET_KEY)" }, { status: 503 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { packageId, locale = "zh" } = await req.json();
    const pkg = GC_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) return NextResponse.json({ error: "Invalid package" }, { status: 400 });

    const totalGc   = Math.floor(pkg.gc * (1 + pkg.bonus / 100));
    const origin    = checkoutOrigin(req);
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
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[topup/checkout]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
