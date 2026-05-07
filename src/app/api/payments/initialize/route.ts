import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const KORAPAY_BASE_URL = 'https://api.korapay.com';

type Gateway = 'paystack' | 'korapay';

function jsonHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      gateway,
      amount,
      email,
      callbackUrl,
      metadata,
    }: {
      gateway: Gateway;
      amount: number;
      email: string;
      callbackUrl: string;
      metadata?: Record<string, unknown>;
    } = body;

    if (!gateway || !['paystack', 'korapay'].includes(gateway)) {
      return NextResponse.json({ error: 'Unsupported payment gateway.' }, { status: 400 });
    }

    if (!amount || amount <= 0 || !email || !callbackUrl) {
      return NextResponse.json({ error: 'Missing required payment fields.' }, { status: 400 });
    }

    const reference = `txn_${randomUUID()}`;

    if (gateway === 'paystack') {
      const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
      if (!paystackSecret) {
        return NextResponse.json({ error: 'PAYSTACK_SECRET_KEY is not configured.' }, { status: 500 });
      }

      const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
        method: 'POST',
        headers: jsonHeaders(paystackSecret),
        body: JSON.stringify({
          email,
          amount: Math.round(amount * 100),
          currency: 'NGN',
          reference,
          callback_url: callbackUrl,
          metadata: metadata || {},
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.status) {
        return NextResponse.json(
          { error: payload?.message || 'Unable to initialize Paystack transaction.' },
          { status: response.status || 500 }
        );
      }

      return NextResponse.json({
        gateway,
        reference: payload.data.reference,
        checkoutUrl: payload.data.authorization_url,
        accessCode: payload.data.access_code,
      });
    }

    const korapaySecret = process.env.KORAPAY_SECRET_KEY;
    if (!korapaySecret) {
      return NextResponse.json({ error: 'KORAPAY_SECRET_KEY is not configured.' }, { status: 500 });
    }

    const response = await fetch(`${KORAPAY_BASE_URL}/merchant/api/v1/charges/initialize`, {
      method: 'POST',
      headers: jsonHeaders(korapaySecret),
      body: JSON.stringify({
        amount,
        currency: 'NGN',
        reference,
        redirect_url: callbackUrl,
        customer: { email },
        metadata: metadata || {},
      }),
    });

    const payload = await response.json();
    if (!response.ok || payload?.status !== true) {
      return NextResponse.json(
        { error: payload?.message || 'Unable to initialize Korapay transaction.' },
        { status: response.status || 500 }
      );
    }

    const checkoutUrl =
      payload?.data?.checkout_url ||
      payload?.data?.checkout_url_url ||
      payload?.data?.payment_url;

    if (!checkoutUrl) {
      return NextResponse.json({ error: 'Korapay did not return a checkout URL.' }, { status: 502 });
    }

    return NextResponse.json({
      gateway,
      reference,
      checkoutUrl,
    });
  } catch (error: any) {
    console.error('Payment initialize error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to initialize payment.' },
      { status: 500 }
    );
  }
}
