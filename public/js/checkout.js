(function () {
  const form = document.getElementById('payment-form');
  if (!form) return;

  const stripe = Stripe(form.dataset.publishableKey);
  let elements;
  const submitBtn = document.getElementById('submit');
  const buttonText = document.getElementById('button-text');
  const spinner = document.getElementById('spinner');
  const messageDiv = document.getElementById('payment-message');

  function showMessage(msg) {
    messageDiv.textContent = msg;
    messageDiv.classList.remove('d-none');
  }
  function setLoading(loading) {
    submitBtn.disabled = loading;
    buttonText.classList.toggle('d-none', loading);
    spinner.classList.toggle('d-none', !loading);
  }

  async function initialize() {
    const res = await fetch('/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: form.dataset.item })
    });
    const data = await res.json();
    if (data.error) return showMessage(data.error);

    elements = stripe.elements({ clientSecret: data.clientSecret });
    elements.create('payment').mount('#payment-element');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/success`,
        receipt_email: document.getElementById('email').value
      }
    });
    if (error) { showMessage(error.message); setLoading(false); }
  });

  initialize();
})();