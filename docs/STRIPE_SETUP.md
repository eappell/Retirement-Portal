# Stripe Setup for Upgrade Flow 🔐

This document explains how to set up Stripe for the Upgrade (subscription) flow used by the Portal app. Follow these steps in order and test thoroughly in **Stripe Test Mode** before switching to live keys.

---

## 1) Create & verify a Stripe account

- Sign up at: https://dashboard.stripe.com
- Complete identity/business verification and add a bank account for payouts.
- Enable email receipts: Dashboard → Settings → Email receipts.

---

## 2) Choose billing model & create Products / Prices

- Decide whether you want subscriptions (recurring) or one-time charges.
- Dashboard → Products → Create a product for each plan (e.g., "Retirement Imminent").
- Add a **Price** for each product and note the **Price ID** (starts with `price_...`).

---

## 3) Add API keys & environment variables

Set the following environment variables in your deployment (and `.env.local` for local dev):

- `STRIPE_PUBLISHABLE_KEY` (client-side)
- `STRIPE_SECRET_KEY` (server-side)
- `STRIPE_WEBHOOK_SECRET` (after you add webhook endpoint)
- `APP_URL` (e.g., `https://your-app.com`) — used for redirect URLs

> Keep secret keys in server-side env and never commit them to source control.

---

## 4) Implement a Checkout session (server-side)

Use Stripe Checkout for a secure, minimal-integration approach. Example (Node / Next.js API route):

```ts
// pages/api/create-checkout-session.ts
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2022-11-15' });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { priceId, userId } = req.body;
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription', // or 'payment'
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.APP_URL}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL}/upgrade/cancel`,
    metadata: { userId },
  });
  res.json({ url: session.url });
}
```

Client: call this endpoint and redirect the user to the returned `session.url`.

---

## 5) Webhooks: mark users as paid + handle renewals

- Dashboard → Developers → Webhooks → Add endpoint (e.g., `https://your-app.com/api/webhook`).
- Subscribe to events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`.
- Save the **Signing secret** and set `STRIPE_WEBHOOK_SECRET` in your env.

Webhook handler example (verify signature):

```ts
// pages/api/webhook.ts (raw body required)
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2022-11-15' });

export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const buf = await buffer(req);
  const sig = req.headers['stripe-signature']!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    // Mark user as 'paid' in your DB, store customer/subscription IDs
  }

  if (event.type === 'invoice.payment_failed') {
    // Handle failed payments (notify user, mark subscription as unpaid, etc.)
  }

  res.json({ received: true });
}

// helper: read raw body
import { NextApiRequest as Req } from 'next';
import { Readable } from 'stream';
async function buffer(readable: Readable) {
  const chunks: any[] = [];
  for await (const chunk of readable) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}
```

---

## 6) Testing tips

- Use **Stripe Test mode**: test cards like `4242 4242 4242 4242`.
- Use the Stripe CLI to forward webhooks to your local server: `stripe listen --forward-to localhost:3000/api/webhook`.
- Test lifecycle events: subscription creation, renewal, cancellation, failed payments.

---

## 7) Go live

- Replace test API keys with live keys in production env.
- Reconfigure webhook endpoint in Dashboard (get a new webhook signing secret and update `STRIPE_WEBHOOK_SECRET`).
- Run a small live charge to verify end-to-end.

---

## 8) Checklist (quick)

- [ ] Create Stripe account & verify
- [ ] Create Products & Prices → copy Price IDs
- [ ] Add keys to env: `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- [ ] Implement checkout session endpoint + client redirect
- [ ] Implement webhook handler and verify signature
- [ ] Test thoroughly in test mode + Stripe CLI
- [ ] Replace with live keys and test again

---

## Notes & references

- Stripe Checkout guides: https://stripe.com/docs/payments/checkout
- Webhooks: https://stripe.com/docs/webhooks
- Stripe CLI: https://stripe.com/docs/stripe-cli

---

If you'd like, I can also add a sample API endpoint and webhook handler into this repo (Next.js style), add a small test script for the Stripe CLI, and a short README on how to run local tests. Want me to implement those changes now?