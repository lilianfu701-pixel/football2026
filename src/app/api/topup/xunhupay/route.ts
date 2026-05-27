import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@/lib/supabase/server";
import { createServiceClient }       from "@/lib/supabase/service";
import { createXunhuOrder, XunhuPayment } from "@/lib/xunhupay";
import { GC_PACKAGES }               from "@/lib/stripe";

const PRICE_MAP: Record<string, string> = {
  s1: "6",
  s2: "15",
  s3: "25",
  s4: "38",
  s5: "88",
  s6: "238",
};

export async function POST(req: NextRequest) {
  if (!process.env.XUNHUPAY_APPID) {
    return NextResponse.json({ error: "微信/支付宝支付未配置" }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let packageId: string, payment: XunhuPayment, locale: string;
  try {
    ({ packageId, payment = "wechat", locale = "zh" } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const pkg = GC_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) return NextResponse.json({ error: "Invalid package" }, { status: 400 });

  const fee = PRICE_MAP[packageId];
  if (!fee) return NextResponse.json({ error: "Package price not configured" }, { status: 400 });

  if (payment !== "wechat" && payment !== "alipay") {
    return NextResponse.json({ error: "Invalid payment type" }, { status: 400 });
  }

  const totalGc  = Math.floor(pkg.gc * (1 + pkg.bonus / 100));
  const tradeId  = `gc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const origin   = process.env.NEXT_PUBLIC_SITE_URL ?? "https://football2026.net";
  const notifyUrl = `${origin}/api/webhooks/xunhupay`;
  const returnUrl = `${origin}/${locale}/profile/topup/success?type=${payment}&gc=${totalGc}`;
  const title    = `Football2026 GoalCoin ${pkg.label}`;

  // ── Store pending order so webhook can look up userId + gcAmount ──
  const service = createServiceClient();
  await service.from("gc_transactions").insert({
    user_id:           user.id,
    type:              "topup_pending",
    amount:            totalGc,
    note:              `虎皮椒待支付 ${tradeId}`,
    stripe_session_id: `xunhu_pending_${tradeId}`,
  });

  try {
    const url = await createXunhuOrder({
      payment,
      tradeId,
      totalFee:  fee,
      title,
      notifyUrl,
      returnUrl,
    });
    return NextResponse.json({ url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[topup/xunhupay]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
