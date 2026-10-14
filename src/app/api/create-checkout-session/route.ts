import { NextRequest, NextResponse } from 'next/server';
import DodoPayments from 'dodopayments';

if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    const productId = process.env.NEXT_PUBLIC_DODO_PRODUCT_ID;

    if (!apiKey) {
      return NextResponse.json({ error: 'Payment service not configured.' }, { status: 500 });
    }
    if (!productId) {
      return NextResponse.json({ error: 'Product not configured.' }, { status: 500 });
    }

    // Determine base URL for return_url (works on localhost and Netlify)
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXTAUTH_URL ||
      'https://prepbite.netlify.app';

    const client = new DodoPayments({
      bearerToken: apiKey,
      environment: 'live_mode',
    });

    const session = await client.checkoutSessions.create({
      product_cart: [{
        product_id: productId,
        quantity: 1,
      }],
      return_url: `${siteUrl}/success`,
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
