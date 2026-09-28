# Stripe Press Shop

A small demo shop built with Node, Express and Handlebars. You pick a book, pay for it with the Stripe Payment Element, and land on a confirmation page that shows what you paid and the PaymentIntent ID.

I started from the [sa-takehome-project-node](https://github.com/mattmitchell6/sa-takehome-project-node) boilerplate. It already had the page layout (Express, Handlebars, Bootstrap) but nothing Stripe-related, so the Stripe integration is what I added.

## Running it

You'll need Node 14+, npm, and a free [Stripe account](https://dashboard.stripe.com/register). Test mode is all you need.

```bash
git clone <this-repo-url>
cd sa-takehome-project-node
npm install
cp sample.env .env
```

Open `.env` and add your test keys from [Dashboard → Developers → API keys](https://dashboard.stripe.com/test/apikeys):

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Then:

```bash
npm start
```

Go to http://localhost:3000, pick a book, and pay with a [test card](https://stripe.com/docs/testing) like `4242 4242 4242 4242` (any future expiry, any CVC, any ZIP). You should end up on `/success` with the amount and PaymentIntent ID. `.env` is git-ignored, so your keys won't get committed.

## How it works

It's one Express server rendering Handlebars views, plus a small script (`public/js/checkout.js`) that talks to Stripe.js in the browser. No build step, no frontend framework, no database. The catalog lives in `items.js`, which is the only place titles and prices are defined.

The flow:

1. `GET /` shows the book list.
2. Clicking "Purchase" takes you to `/checkout?item=N`, which renders the checkout page with the publishable key and the item id.
3. The page calls `POST /create-payment-intent` with the item id. The server creates a PaymentIntent and sends back the `client_secret`.
4. The Payment Element mounts and the customer enters their details.
5. On submit, `stripe.confirmPayment()` runs in the browser and Stripe redirects to `/success?payment_intent=pi_...`.
6. `/success` retrieves the PaymentIntent from Stripe and renders the confirmation from that.

I made two decisions on purpose:

**The server sets the price.** `/create-payment-intent` looks up the amount in `items.js` from the item id. It never takes an amount from the browser, so nobody can change the price in dev tools and pay less.

**The success page doesn't trust the URL.** Stripe redirects back with the PaymentIntent ID in the query string, but I don't build the page from that. The server calls `paymentIntents.retrieve()` and shows whatever Stripe says the status and amount are.

### Stripe pieces used

- **PaymentIntents API** (`create` and `retrieve`) through the Node SDK. I create one PaymentIntent per checkout attempt with `automatic_payment_methods` enabled, so whatever payment methods are turned on for the account show up without me listing them.
- **Stripe.js v3 and the Payment Element.** `stripe.elements({ clientSecret })` sets up Elements for that PaymentIntent, and `elements.create('payment')` mounts into `#payment-element`.
- **`stripe.confirmPayment()`** submits the form, confirms the PaymentIntent, and redirects to the `return_url`.

I used the Payment Element rather than Stripe Checkout because the assignment asked for it. It also keeps the customer on the shop's own page instead of sending them to a Stripe-hosted one.

## Approach, docs, and things that tripped me up

I wanted the whole loop working first (create the intent, mount the element, confirm, show a real confirmation) before touching anything cosmetic. The boilerplate already had the page shell and env setup, so almost all the work was in `app.js` and the two checkout views.

Docs I leaned on:

- [Accept a payment](https://stripe.com/docs/payments/quickstart)
- [Payment Element](https://stripe.com/docs/payments/payment-element)
- [PaymentIntents API reference](https://stripe.com/docs/api/payment_intents)
- [Payment Element migration guide (next actions and redirects)](https://stripe.com/docs/payments/payment-element/migration)
- [Testing](https://stripe.com/docs/testing)

Things that took some thought:

- **Redirect-based payment methods.** Some methods, like bank redirects, send the customer off the page and back again, so I couldn't rely on what `confirmPayment()` returns in the browser. The confirmation has to be rebuildable from the `return_url` alone, which is why `/success` re-fetches the PaymentIntent.
- **Where the prices lived.** The boilerplate picked the price with a `switch` inside the `/checkout` route. I needed the same prices for the actual charge, so I moved them into a shared `items.js`. Now the displayed price and the charged amount can't drift apart.
- **Per-page scripts in Handlebars.** The default layout doesn't make page-specific `<script>` tags easy. I load Stripe.js globally in the layout (it's cheap) and keep the checkout logic in `checkout.js`, included only on the checkout page.

## What I'd do next

- **Webhooks.** Add a `POST /webhook` endpoint that verifies the signature and handles `payment_intent.succeeded` and `payment_intent.payment_failed`. Right now the confirmation page is the only place a success gets recorded, and that depends on the customer's browser making it back. A webhook is the dependable trigger for things like emailing the book or updating inventory.
- **A real database.** Replace `items.js` and the in-memory flow with storage for orders, inventory, and customers, so they survive a restart.
- **Multi-item cart.** It's one book per checkout today. A cart would need a PaymentIntent built from a computed total, plus `paymentIntents.update()` if the cart changes afterward.
- **Saved cards.** A SetupIntent and a Customer object would let returning customers check out faster.
- **Receipts and tax.** Turn on Stripe's email receipts and add Stripe Tax so tax is calculated into the amount automatically.
- **Idempotency keys.** Pass one to `paymentIntents.create()` so a retry after a flaky network can't create two PaymentIntents for the same checkout attempt.
- **Better status handling.** The success page lumps `requires_action`, `processing`, and `canceled` together as "not succeeded." They should be shown separately. A Radar review queue for flagged payments would also help.
- **Tests.** Integration tests for `/create-payment-intent` and `/success`, either against Stripe's test mode or with `stripe-mock`.