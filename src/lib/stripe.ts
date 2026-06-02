import Stripe from "stripe";

// Singleton — avoids creating a new Stripe instance on every hot-reload
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-04-22.dahlia",
    });
  }
  return _stripe;
}

/** GC packages — source of truth shared between API and UI */
export const GC_PACKAGES = [
  { id: "s1", gc: 100_000,    label: "10万 GC",   priceCny: 14,  priceUsdt: 1.99,  bonus: 0  },
  { id: "s2", gc: 300_000,    label: "30万 GC",   priceCny: 34,  priceUsdt: 4.99,  bonus: 10 },
  { id: "s3", gc: 600_000,    label: "60万 GC",   priceCny: 61,  priceUsdt: 8.99,  bonus: 20 },
  { id: "s4", gc: 1_000_000,  label: "100万 GC",  priceCny: 95,  priceUsdt: 13.99, bonus: 30 },
  { id: "s5", gc: 3_000_000,  label: "300万 GC",  priceCny: 238, priceUsdt: 34.99, bonus: 50 },
  { id: "s6", gc: 10_000_000, label: "1000万 GC", priceCny: 680, priceUsdt: 99.99, bonus: 80 },
] as const;

export type GcPackageId = (typeof GC_PACKAGES)[number]["id"];
