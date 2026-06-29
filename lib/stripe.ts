import Stripe from "stripe";
import { sampleRevenue } from "@/lib/sampleData";

export type Revenue = {
  thisMonth: number; // cents
  lastMonth: number; // cents
  allTime: number; // cents
  live: boolean; // true when pulled from Stripe, false when sample
};

let cached: Stripe | null = null;
function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!cached) cached = new Stripe(key);
  return cached;
}

function monthStart(offset: number): number {
  const d = new Date();
  d.setMonth(d.getMonth() + offset, 1);
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

/** Sum succeeded charges created at/after `gte` (and before `lt` if given). */
async function sumCharges(
  stripe: Stripe,
  gte: number,
  lt?: number
): Promise<number> {
  let total = 0;
  let pages = 0;
  const params: Stripe.ChargeListParams = {
    limit: 100,
    created: lt ? { gte, lt } : { gte },
  };
  for await (const charge of stripe.charges.list(params)) {
    if (charge.paid && charge.status === "succeeded" && !charge.refunded) {
      total += charge.amount - (charge.amount_refunded ?? 0);
    }
    // Safety cap so a huge account can't stall the dashboard render.
    if (++pages > 5000) break;
  }
  return total;
}

/**
 * Total revenue this month, last month and all time, pulled from Stripe.
 * Falls back to sample figures when STRIPE_SECRET_KEY is not configured or
 * the API call fails.
 */
export async function getRevenue(): Promise<Revenue> {
  const stripe = stripeClient();
  if (!stripe) return { ...sampleRevenue, live: false };

  try {
    const thisMonthStart = monthStart(0);
    const lastMonthStart = monthStart(-1);

    const [thisMonth, lastMonth, allTime] = await Promise.all([
      sumCharges(stripe, thisMonthStart),
      sumCharges(stripe, lastMonthStart, thisMonthStart),
      sumCharges(stripe, 0),
    ]);

    return { thisMonth, lastMonth, allTime, live: true };
  } catch (err) {
    console.error("[stripe] revenue fetch failed, using sample data:", err);
    return { ...sampleRevenue, live: false };
  }
}
