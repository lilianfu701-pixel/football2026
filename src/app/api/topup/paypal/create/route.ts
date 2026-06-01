import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GC_PACKAGES } from "@/lib/stripe";
import { createPayPalOrder } from "@/lib/paypal";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { packageId } = await req.json();
    const pkg = GC_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) return NextResponse.json({ error: "Invalid package" }, { status: 400 });

    const totalGc   = Math.floor(pkg.gc * (1 + pkg.bonus / 100));
    const desc      = `GoalCoin ${pkg.label}${pkg.bonus > 0 ? ` (+${pkg.bonus}% 赠送)` : ""}，实得 ${(totalGc / 1_000_000).toFixed(0)}M GC`;
    const orderID   = await createPayPalOrder(pkg.priceUsdt, desc);

    return NextResponse.json({ orderID });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[paypal/create]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
