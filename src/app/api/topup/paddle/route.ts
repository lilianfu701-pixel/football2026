import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@/lib/supabase/server";
import { createPaddleCheckout, PADDLE_PRICES } from "@/lib/paddle";

// Package index matches GC_PACKAGES order (s1..s6)
const PKG_INDEX: Record<string, number> = {
  s1: 0, s2: 1, s3: 2, s4: 3, s5: 4, s6: 5,
};

export async function POST(req: NextRequest) {
  if (!process.env.PADDLE_API_KEY) {
    return NextResponse.json({ error: "Paddle not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let packageId: string, locale: string;
  try {
    ({ packageId, locale = "zh" } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const idx   = PKG_INDEX[packageId];
  const price = PADDLE_PRICES[idx];
  if (idx === undefined || !price?.id) {
    return NextResponse.json({ error: "Invalid package or Paddle price not configured" }, { status: 400 });
  }

  const gcAmount  = Math.floor(price.gc * (1 + price.bonus / 100));
  const origin    = process.env.NEXT_PUBLIC_SITE_URL ?? "https://football2026.net";
  const successUrl = `${origin}/${locale}/profile/topup/success?type=paddle&gc=${gcAmount}`;

  try {
    const checkoutUrl = await createPaddleCheckout({
      priceId:    price.id,
      userId:     user.id,
      gcAmount,
      email:      user.email,
      successUrl,
    });
    return NextResponse.json({ url: checkoutUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[topup/paddle]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
