import { NextResponse } from "next/server";
import { getUsdtMinAmount } from "@/lib/nowpayments";

// Cache the NOWPayments minimum for 1 hour — it almost never changes intra-day.
export const revalidate = 3600;

export async function GET() {
  const minAmount = await getUsdtMinAmount();
  return NextResponse.json({ minAmount });
}
