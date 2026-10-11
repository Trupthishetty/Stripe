# Stripe Press Shop — Stripe Payment Element Integration

A small e-commerce demo (Node.js / Express / Handlebars) that lets a customer pick a book,
pay for it with the **Stripe Payment Element**, and see a confirmation screen showing the
amount charged and the Stripe PaymentIntent ID.

This project started from the [sa-takehome-project-node](https://github.com/mattmitchell6/sa-takehome-project-node)
boilerplate, which provided the page shell (Express, Handlebars, Bootstrap) but had no
Stripe integration wired in. The work here was adding that integration end to end.

---

## 1. How to build, configure, and run

**Requirements:** Node.js 14+, npm, and a free [Stripe account](https://dashboard.stripe.com/register)
(test mode is all you need).

```bash
git clone <this-repo-url>
cd sa-takehome-project-node
npm install
```

Copy the sample environment file and fill in your **test mode** keys from the
[Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/test/apikeys):

```bash
cp sample.env .env
```

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Run it:

```bash
npm start
```

Then open **http://localhost:3000**. Pick a book, fill in the Payment Element with a
[Stripe test card](https://stripe.com/docs/testing) (e.g. `4242 4242 4242 4242`, any future
expiry, any CVC, any ZIP), and submit. You'll land on `/success` with the charge amount and
PaymentIntent ID.

`.env` is git-ignored, so keys are never committed.

---

## 2. How the solution works

### Stripe APIs used

- **PaymentIntents API** (`stripe.paymentIntents.create`, `stripe.paymentIntents.retrieve`) —
  server-side, via the `stripe` Node SDK. One PaymentIntent is created per checkout attempt,
  with `automatic_payment_methods: { enabled: true }` so Stripe can offer whichever payment
  methods are enabled on the account without the integration having to list them manually.
- **Stripe.js v3 + Elements (Payment Element)** — client-side. `stripe.elements({ clientSecret })`
  creates an Elements group scoped to the PaymentIntent, and `elements.create('payment')`
  renders the actual card/wallet input, mounted into `#payment-element`.
- **`stripe.confirmPayment()`** — client-side call that submits the Payment Element and
  confirms the PaymentIntent, then redirects the browser to `return_url` (`/success`).

The **Payment Element** (not Stripe Checkout) was used per the assessment's requirement — it's
embedded directly in the page rather than redirecting to a Stripe-hosted page, which keeps the
whole purchase flow on the merchant's own site.

---

## 3. Approach, docs used, and challenges

**Approach:** Get a minimal, correct version of the full loop working first — create a
PaymentIntent, mount the Payment Element, confirm the payment, and show a real confirmation —
before adding any polish. The existing boilerplate already had the page shell and env var
scaffolding in place, so the actual work was almost entirely in `app.js` and the two checkout
views.

**Docs referenced:**
- [Accept a payment (Payment Element quickstart)](https://stripe.com/docs/payments/quickstart)
- [Payment Element](https://stripe.com/docs/payments/payment-element)
- [PaymentIntents API reference](https://stripe.com/docs/api/payment_intents)
- [Handling next actions / redirect-based payment methods](https://stripe.com/docs/payments/payment-element/migration)
- [Testing](https://stripe.com/docs/testing)

---
