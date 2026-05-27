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
  { id: "s1", gc: 100_000,    label: "10万 GC",   priceCny: 6,   priceUsdt: 1.00,  bonus: 0  },
  { id: "s2", gc: 300_000,    label: "30万 GC",   priceCny: 15,  priceUsdt: 2.00,  bonus: 10 },
  { id: "s3", gc: 600_000,    label: "60万 GC",   priceCny: 25,  priceUsdt: 3.50,  bonus: 20 },
  { id: "s4", gc: 1_000_000,  label: "100万 GC",  priceCny: 38,  priceUsdt: 5.50,  bonus: 30 },
  { id: "s5", gc: 3_000_000,  label: "300万 GC",  priceCny: 88,  priceUsdt: 12.00, bonus: 50 },
  { id: "s6", gc: 10_000_000, label: "1000万 GC", priceCny: 238, priceUsdt: 33.00, bonus: 80 },
] as const;

export type GcPackageId = (typeof GC_PACKAGES)[number]["id"];
