import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@/lib/supabase/server";
import { createPaddleTransaction, PADDLE_PRICES } from "@/lib/paddle";

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

  let packageId: string;
  try {
    ({ packageId } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const idx   = PKG_INDEX[packageId];
  const price = PADDLE_PRICES[idx];
  if (idx === undefined || !price?.id) {
    return NextResponse.json({ error: "Invalid package or Paddle price not configured" }, { status: 400 });
  }

  const gcAmount = Math.floor(price.gc * (1 + price.bonus / 100));

  try {
    const transactionId = await createPaddleTransaction({
      priceId: price.id,
      userId:  user.id,
      gcAmount,
    });
    return NextResponse.json({ transactionId, gcAmount });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[topup/paddle]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
