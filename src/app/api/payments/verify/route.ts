import { NextResponse } from 'next/server';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const KORAPAY_BASE_URL = 'https://api.korapay.com';

type Gateway = 'paystack' | 'korapay';

function jsonHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function verifyKorapay(reference: string, secret: string) {
  const endpoints = [
    {
      url: `${KORAPAY_BASE_URL}/merchant/api/v1/charges/${reference}`,
      method: 'GET',
      body: undefined,
    },
    {
      url: `${KORAPAY_BASE_URL}/merchant/api/v1/charges/verify`,
      method: 'POST',
      body: JSON.stringify({ reference }),
    },
  ];

  for (const endpoint of endpoints) {
    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: jsonHeaders(secret),
      body: endpoint.body,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload) continue;

    const transaction = payload?.data || {};
    const status = String(transaction?.status || '').toLowerCase();
    const settled = status === 'success' || status === 'successful' || status === 'paid';

    return {
      isPaid: settled,
      raw: payload,
      amount: transaction?.amount,
      currency: transaction?.currency,
    };
  }

  throw new Error('Unable to verify Korapay transaction.');
}

export async function POST(req: Request) {
  try {
    const { gateway, reference }: { gateway: Gateway; reference: string } = await req.json();

    if (!gateway || !reference) {
      return NextResponse.json({ error: 'gateway and reference are required.' }, { status: 400 });
    }

    if (gateway === 'paystack') {
      const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
      if (!paystackSecret) {
        return NextResponse.json({ error: 'PAYSTACK_SECRET_KEY is not configured.' }, { status: 500 });
      }

      const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
        method: 'GET',
        headers: jsonHeaders(paystackSecret),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.status) {
        return NextResponse.json(
          { error: payload?.message || 'Unable to verify Paystack transaction.' },
          { status: response.status || 500 }
        );
      }

      return NextResponse.json({
        verified: String(payload?.data?.status).toLowerCase() === 'success',
        amount: payload?.data?.amount,
        currency: payload?.data?.currency,
        raw: payload,
      });
    }

    if (gateway === 'korapay') {
      const korapaySecret = process.env.KORAPAY_SECRET_KEY;
      if (!korapaySecret) {
        return NextResponse.json({ error: 'KORAPAY_SECRET_KEY is not configured.' }, { status: 500 });
      }

      const result = await verifyKorapay(reference, korapaySecret);
      return NextResponse.json({
        verified: result.isPaid,
        amount: result.amount,
        currency: result.currency,
        raw: result.raw,
      });
    }

    return NextResponse.json({ error: 'Unsupported payment gateway.' }, { status: 400 });
  } catch (error: any) {
    console.error('Payment verify error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to verify payment.' },
      { status: 500 }
    );
  }
}
