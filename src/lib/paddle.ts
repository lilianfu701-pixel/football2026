/** Paddle Billing helper — server-side only */

export interface PaddlePrice {
  id: string;       // price ID from Paddle dashboard e.g. pri_xxxxx
  gc:    number;
  label: string;
  bonus: number;
}

/** Map our package IDs → Paddle Price IDs.
 *  Fill in the pri_xxxxx values after creating products in Paddle dashboard. */
export const PADDLE_PRICES: PaddlePrice[] = [
  { id: process.env.PADDLE_PRICE_S1 ?? "", gc: 100_000_000,    label: "1亿 GC",   bonus: 0  },
  { id: process.env.PADDLE_PRICE_S2 ?? "", gc: 300_000_000,    label: "3亿 GC",   bonus: 10 },
  { id: process.env.PADDLE_PRICE_S3 ?? "", gc: 600_000_000,    label: "6亿 GC",   bonus: 20 },
  { id: process.env.PADDLE_PRICE_S4 ?? "", gc: 1_000_000_000,  label: "10亿 GC",  bonus: 30 },
  { id: process.env.PADDLE_PRICE_S5 ?? "", gc: 3_000_000_000,  label: "30亿 GC",  bonus: 50 },
  { id: process.env.PADDLE_PRICE_S6 ?? "", gc: 10_000_000_000, label: "100亿 GC", bonus: 80 },
];

const PADDLE_API = "https://api.paddle.com";
const SANDBOX_API = "https://sandbox-api.paddle.com";

function apiBase() {
  return process.env.PADDLE_SANDBOX === "true" ? SANDBOX_API : PADDLE_API;
}

/** Create a Paddle checkout transaction and return the checkout URL */
export async function createPaddleCheckout(opts: {
  priceId:   string;
  userId:    string;
  gcAmount:  number;
  email?:    string;
  successUrl: string;
}): Promise<string> {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) throw new Error("PADDLE_API_KEY not configured");

  const body = {
    items: [{ price_id: opts.priceId, quantity: 1 }],
    custom_data: {
      user_id:   opts.userId,
      gc_amount: String(opts.gcAmount),
    },
    customer_email: opts.email,
    success_url: opts.successUrl,
  };

  const res = await fetch(`${apiBase()}/transactions`, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json() as {
    data?: { checkout?: { url?: string } };
    error?: { detail?: string };
  };

  if (!res.ok || !data.data?.checkout?.url) {
    throw new Error(data.error?.detail ?? "Failed to create Paddle checkout");
  }

  return data.data.checkout.url;
}
