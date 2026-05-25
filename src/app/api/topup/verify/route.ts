import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sessionId = req.nextUrl.searchParams.get("session_id");
    if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    const stripe  = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Safety: session must belong to this user
    if (session.metadata?.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const paid    = session.payment_status === "paid";
    const gcAmount = Number(session.metadata?.gc_amount ?? 0);

    return NextResponse.json({
      paid,
      gcAmount,
      packageId: session.metadata?.package_id,
      amountTotal: session.amount_total, // in fen
      currency:    session.currency,
    });
  } catch (err) {
    console.error("[topup/verify]", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
