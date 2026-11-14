import { NextRequest, NextResponse } from 'next/server';
import DodoPayments from 'dodopayments';
import { getLifetimeSpots } from '@/lib/lifetimeSpots';

if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Payment service not configured.' }, { status: 500 });
    }

    // Parse requested planType: 'monthly' | 'annual' | 'lifetime'
    const body = await req.json().catch(() => ({}));
    const planType: 'monthly' | 'annual' | 'lifetime' =
      body.planType === 'monthly' || body.planType === 'lifetime' ? body.planType : 'annual';

    let productId: string | undefined;

    if (planType === 'monthly') {
      productId =
        process.env.NEXT_PUBLIC_DODO_MONTHLY_PRODUCT_ID ||
        process.env.NEXT_PUBLIC_DODO_PRODUCT_ID;
    } else if (planType === 'lifetime') {
      // Check if spots are sold out
      const spots = getLifetimeSpots();
      if (spots.soldOut) {
        return NextResponse.json(
          { error: 'Founding Member Lifetime passes are sold out!' },
          { status: 400 }
        );
      }
      productId = process.env.NEXT_PUBLIC_DODO_LIFETIME_PRODUCT_ID;
    } else {
      // Default: annual
      productId = process.env.NEXT_PUBLIC_DODO_ANNUAL_PRODUCT_ID;
    }

    if (!productId) {
      return NextResponse.json({ error: `Product ID for ${planType} plan is not configured.` }, { status: 500 });
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
      return_url: `${siteUrl}/success?plan=${planType}`,
    });

    return NextResponse.json({ checkout_url: session.checkout_url, planType });
  } catch (err) {
    console.error('[API /create-checkout-session] Error:', err);
    return NextResponse.json(
      { error: 'Unable to start checkout. Please try again.' },
      { status: 500 }
    );
  }
}
