const express = require('express');
const path = require('path');
const exphbs = require('express-handlebars');
require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const items = require('./items');

const app = express();
app.engine('hbs', exphbs({ defaultLayout: 'main', extname: '.hbs' }));
app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => res.render('index'));

app.get('/checkout', (req, res) => {
  const item = items[req.query.item];
  if (!item) return res.render('checkout', { error: 'No item selected' });

  res.render('checkout', {
    itemId: req.query.item,
    title: item.title,
    amount: item.amount,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  });
});

// NEW — creates the PaymentIntent the Payment Element needs a client_secret for
app.post('/create-payment-intent', async (req, res) => {
  const item = items[req.body.item];
  if (!item) return res.status(400).json({ error: 'Unknown item.' });

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

// CHANGED — now retrieves the real PaymentIntent instead of a static page
app.get('/success', async (req, res) => {
  const paymentIntentId = req.query.payment_intent;
  if (!paymentIntentId) return res.redirect('/');

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
    res.render('success', { error: 'Could not retrieve payment details.' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Getting served on port ${port}`));