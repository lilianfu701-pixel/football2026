import { NextRequest, NextResponse } from "next/server";
import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: paymentId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data: payment } = await service
    .from("usdt_payments")
    .select("status, gc_amount, pay_address, pay_amount, created_at")
    .eq("payment_id", paymentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  return NextResponse.json({
    status:     payment.status,
    gcAmount:   payment.gc_amount,
    payAddress: payment.pay_address,
    payAmount:  payment.pay_amount,
    createdAt:  payment.created_at,
  });
}
