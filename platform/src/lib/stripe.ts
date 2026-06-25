import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-06-24.dahlia',
})

export const PLATFORM_FEE_PERCENT = 20 // Platform keeps 20%, creator keeps 80%

export function calculateFees(priceCents: number, creatorSharePercent = 80) {
  const platformFeeCents = Math.round(priceCents * (1 - creatorSharePercent / 100))
  const creatorEarningsCents = priceCents - platformFeeCents
  return { platformFeeCents, creatorEarningsCents }
}

export async function createConnectedAccount(email: string) {
  return stripe.accounts.create({
    type: 'express',
    email,
    capabilities: {
      transfers: { requested: true },
      card_payments: { requested: true },
    },
  })
}

export async function createAccountLink(accountId: string, baseUrl: string) {
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${baseUrl}/settings?stripe=refresh`,
    return_url: `${baseUrl}/settings?stripe=success`,
    type: 'account_onboarding',
  })
}

export async function createPaymentIntent(
  amountCents: number,
  creatorStripeAccountId: string,
  metadata: Record<string, string>
) {
  const { platformFeeCents } = calculateFees(amountCents)

  return stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    application_fee_amount: platformFeeCents,
    transfer_data: { destination: creatorStripeAccountId },
    metadata,
  })
}

export async function createCheckoutSession(
  contentId: string,
  contentTitle: string,
  priceCents: number,
  creatorStripeAccountId: string,
  buyerEmail: string,
  successUrl: string,
  cancelUrl: string
) {
  const { platformFeeCents } = calculateFees(priceCents)

  return stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: buyerEmail,
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: contentTitle },
        unit_amount: priceCents,
      },
      quantity: 1,
    }],
    payment_intent_data: {
      application_fee_amount: platformFeeCents,
      transfer_data: { destination: creatorStripeAccountId },
      metadata: { content_id: contentId },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  })
}
