import { NextResponse } from 'next/server';
import { getKorapaySecretKey, getPaystackSecretKey } from '@/lib/payment-server-secrets';

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
      metadata: transaction?.metadata || {},
    };
  }

  throw new Error('Unable to verify Korapay transaction.');
}

import { processAttendeeTicket } from '@/lib/ticket-service-admin';

export async function POST(req: Request) {
  try {
    const { gateway, reference }: { gateway: Gateway; reference: string } = await req.json();

    if (!gateway || !reference) {
      return NextResponse.json({ error: 'gateway and reference are required.' }, { status: 400 });
    }

    if (gateway === 'paystack') {
      const paystackSecret = getPaystackSecretKey();
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

      const verified = String(payload?.data?.status).toLowerCase() === 'success';
      const amount = payload?.data?.amount;
      const currency = payload?.data?.currency;
      const metadata = payload?.data?.metadata || {};

      let ticketId = null;
      if (verified && metadata.eventId && metadata.userId) {
        try {
          ticketId = await processAttendeeTicket({
            reference,
            eventId: metadata.eventId,
            userId: metadata.userId,
            packageName: metadata.package || 'Standard',
            amountPaid: amount / 100,
            gateway: 'paystack',
          });
        } catch (ticketError) {
          console.error('Failed to generate attendee ticket during Paystack verify fallback:', ticketError);
        }
      }

      return NextResponse.json({
        verified,
        amount,
        currency,
        metadata,
        ticketId,
        raw: payload,
      });
    }

    if (gateway === 'korapay') {
      const korapaySecret = getKorapaySecretKey();
      if (!korapaySecret) {
        return NextResponse.json({ error: 'KORAPAY_SECRET_KEY is not configured.' }, { status: 500 });
      }

      const result = await verifyKorapay(reference, korapaySecret);

      let ticketId = null;
      if (result.isPaid && result.metadata.eventId && result.metadata.userId) {
        try {
          ticketId = await processAttendeeTicket({
            reference,
            eventId: result.metadata.eventId,
            userId: result.metadata.userId,
            packageName: result.metadata.package || 'Standard',
            amountPaid: result.amount,
            gateway: 'korapay',
          });
        } catch (ticketError) {
          console.error('Failed to generate attendee ticket during Korapay verify fallback:', ticketError);
        }
      }

      return NextResponse.json({
        verified: result.isPaid,
        amount: result.amount,
        currency: result.currency,
        metadata: result.metadata || {},
        ticketId,
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
