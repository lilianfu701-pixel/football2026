/**
 * NOWPayments — server-side only
 * Docs: https://documenter.getpostman.com/view/7907941/2s93JqTRst
 *
 * Used for USDT TRC-20 payments with automatic IPN callback.
 */

const API_BASE = "https://api.nowpayments.io/v1";

export interface NowPaymentResult {
  paymentId: string;
  payAddress: string;
  /** Exact USDT amount the user must send (may include NOWPayments fee) */
  payAmount: number;
}

/**
 * Create a USDT TRC-20 payment via NOWPayments.
 * Returns a unique pay_address per order — user sends exact pay_amount to it.
 */
export async function createNowPayment(opts: {
  priceUsdt:   number;
  orderId:     string;
  description: string;
  callbackUrl: string;
}): Promise<NowPaymentResult> {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey) throw new Error("NOWPAYMENTS_API_KEY not configured");

  const res = await fetch(`${API_BASE}/payment`, {
    method:  "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      price_amount:      opts.priceUsdt,
      price_currency:    "usd",
      pay_currency:      "usdttrc20",
      order_id:          opts.orderId,
      order_description: opts.description,
      ipn_callback_url:  opts.callbackUrl,
    }),
  });

  const data = await res.json() as Record<string, unknown>;
  if (res.status !== 201) {
    throw new Error(`NOWPayments error: ${data.message ?? "create payment failed"}`);
  }

  return {
    paymentId:  data.payment_id  as string,
    payAddress: data.pay_address as string,
    payAmount:  Number(data.pay_amount),
  };
}

/**
 * Verify the x-nowpayments-sig IPN header.
 * NOWPayments signs with HMAC-SHA512 over the JSON body with keys sorted alphabetically.
 */
export function verifyNowPaymentsSignature(
  rawBody:   string,
  signature: string,
  secret:    string,
): boolean {
  try {
    const { createHmac } = require("crypto") as typeof import("crypto");
    const sorted   = deepSortJson(JSON.parse(rawBody));
    const expected = createHmac("sha512", secret)
      .update(JSON.stringify(sorted))
      .digest("hex");
    return expected === signature;
  } catch {
    return false;
  }
}

function deepSortJson(obj: unknown): unknown {
  if (Array.isArray(obj))   return obj.map(deepSortJson);
  if (obj !== null && typeof obj === "object") {
    return Object.keys(obj as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = deepSortJson((obj as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return obj;
}
