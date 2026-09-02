import { NextResponse } from 'next/server';
import DodoPayments from 'dodopayments';

if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export async function POST() {
  try {
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Payment service not configured.' }, { status: 500 });
    }

    const client = new DodoPayments({
      bearerToken: apiKey,
      environment: 'test_mode',
    });

    const session = await client.checkoutSessions.create({
      product_cart: [{
        product_id: 'pdt_0NmVYwSWYswrolmeFxfXq',
        quantity: 1,
      }],
      return_url: 'http://localhost:3000/success',
    });

    return NextResponse.json({ checkout_url: session.checkout_url });
  } catch (err) {
    console.error('[API /create-checkout-session] Error:', err);
    return NextResponse.json(
      { error: 'Unable to start checkout. Please try again.' },
      { status: 500 }
    );
  }
}
