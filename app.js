const express = require('express');
const path = require('path');
const exphbs = require('express-handlebars');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

var app = express();

// view engine setup (Handlebars)
app.engine('hbs', exphbs({
  defaultLayout: 'main',
  extname: '.hbs'
}));
app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }))
app.use(express.json({}));

/**
 * Catalog. Just hardcoding amounts here to avoid using a database.
 * Amounts are in the smallest currency unit (cents). This is the single
 * source of truth for pricing: the checkout page displays it, and the
 * PaymentIntent is created from it, so the browser never decides the price.
 */
const items = {
  '1': { title: "The Art of Doing Science and Engineering", amount: 2300 },
  '2': { title: "The Making of Prince of Persia: Journals 1985-1993", amount: 2500 },
  '3': { title: "Working in Public: The Making and Maintenance of Open Source", amount: 2800 }
};

/**
 * Home route
 */
app.get('/', function(req, res) {
  res.render('index');
});

/**
 * Checkout route
 */
app.get('/checkout', function(req, res) {
  const itemId = req.query.item;
  const item = items[itemId];

  if (!item) {
    // Included in layout view, feel free to assign error
    return res.render('checkout', { error: "No item selected" });
  }

  res.render('checkout', {
    itemId: itemId,
    title: item.title,
    amount: item.amount,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  });
});

/**
 * Create a PaymentIntent for the selected item.
 * The amount is looked up server-side from the catalog; the client only
 * sends an item id.
 */
app.post('/create-payment-intent', async function(req, res) {
  const item = items[req.body.item];
  if (!item) {
    return res.status(400).json({ error: 'Unknown item.' });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: item.amount,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: { item_id: req.body.item, title: item.title }
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to create payment intent.' });
  }
});

/**
 * Success route
 * Stripe redirects here with ?payment_intent=pi_... after confirmation.
 * We retrieve the PaymentIntent from Stripe rather than trusting the URL.
 */
app.get('/success', async function(req, res) {
  const paymentIntentId = req.query.payment_intent;
  if (!paymentIntentId) {
    return res.redirect('/');
  }

  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    res.render('success', {
      succeeded: pi.status === 'succeeded',
      status: pi.status,
      amount: (pi.amount / 100).toFixed(2),
      currency: pi.currency.toUpperCase(),
      paymentIntentId: pi.id
    });
  } catch (err) {
    console.error(err);
    res.render('success', { error: 'Could not retrieve payment details.' });
  }
});

/**
 * Start server
 */
app.listen(3000, () => {
  console.log('Getting served on port 3000');
});