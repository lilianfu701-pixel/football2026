/**
 * PayPal REST API v2 helpers (server-side only)
 * Docs: https://developer.paypal.com/docs/api/orders/v2/
 */

const BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

/** Fetch a short-lived OAuth2 access token */
export async function getPayPalToken(): Promise<string> {
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
        ).toString("base64"),
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal token error: ${res.status}`);
  const data = await res.json();
  return data.access_token as string;
}

/** Create a PayPal Order and return the order ID */
export async function createPayPalOrder(
  amountCny: number,
  description: string
): Promise<string> {
  const token = await getPayPalToken();
  const res   = await fetch(`${BASE}/v2/checkout/orders`, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      Authorization:   `Bearer ${token}`,
      "PayPal-Request-Id": `gc-${Date.now()}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          description,
          amount: {
            currency_code: "CNY",
            value: amountCny.toFixed(2),
          },
        },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal create order error: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.id as string;
}

/** Capture an approved PayPal Order, return capture status */
export async function capturePayPalOrder(
  orderID: string
): Promise<{ status: string; captureId: string }> {
  const token = await getPayPalToken();
  const res   = await fetch(`${BASE}/v2/checkout/orders/${orderID}/capture`, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:  `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal capture error: ${res.status} ${err}`);
  }
  const data      = await res.json();
  const captureId = data.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? "";
  return { status: data.status as string, captureId };
}
