import Stripe from "stripe";

let stripeInstance: Stripe | undefined;

export function getStripe(): Stripe {
  if (stripeInstance) return stripeInstance;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  stripeInstance = new Stripe(key, {
    apiVersion: "2026-05-27.dahlia",
    typescript: true,
  });
  return stripeInstance;
}

export const stripe = new Proxy({} as Stripe, {
  get(_, prop: string | symbol) {
    const client = getStripe();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export const PLANS = {
  STARTER: {
    name: "Starter",
    priceId: process.env.STRIPE_STARTER_PRICE_ID || "",
    limits: { invoices: 10, users: 1 },
  },
  GROWTH: {
    name: "Growth",
    priceId: process.env.STRIPE_GROWTH_PRICE_ID || "",
    limits: { invoices: 100, users: 3 },
  },
  SCALE: {
    name: "Scale",
    priceId: process.env.STRIPE_SCALE_PRICE_ID || "",
    limits: { invoices: Infinity, users: Infinity },
  },
};
