import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import crypto from 'crypto';
import { getKorapaySecretKey } from '@/lib/payment-server-secrets';

import { processAttendeeTicket } from '@/lib/ticket-service-admin';

function isValidSignature(body: string, signature: string, secret: string) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');

  if (expectedBuffer.length !== signatureBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

async function writeAuditOnce(docId: string, payload: Record<string, unknown>) {
  try {
    await adminDb.collection('transactionAudits').doc(docId).create(payload);
    return true;
  } catch (error: any) {
    if (error?.code === 6 || error?.code === '6') {
      return false;
    }
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-korapay-signature');
    const secret = getKorapaySecretKey();

    if (!signature || !secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.text();
    if (!isValidSignature(body, signature, secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.event === 'charge.success' || event.data?.status === 'success') {
      const data = event.data || event;
      const reference = data.reference;
      const amount = data.amount;
      const metadata = data.metadata || {};

      // If it's an attendee ticket purchase, generate the ticket server-side
      if (metadata.eventId && metadata.userId) {
        try {
          await processAttendeeTicket({
            reference,
            eventId: metadata.eventId,
            userId: metadata.userId,
            packageName: metadata.package || 'Standard',
            amountPaid: amount,
            gateway: 'korapay',
          });
        } catch (ticketError) {
          console.error('Failed to generate attendee ticket in webhook:', ticketError);
        }
      }

      const auditId = `webhook_korapay_completed_${reference}`;
      await writeAuditOnce(auditId, {
        id: auditId,
        type: 'ticket_purchase',
        amount,
        currency: 'NGN',
        status: 'completed',
        gateway: 'korapay',
        reference,
        description: `Ticket purchase via Korapay - ${metadata.package || 'Standard'}`,
        metadata: {
          eventId: metadata.eventId,
          userId: metadata.userId,
          package: metadata.package,
        },
        webhookEvent: event.event || event.data?.status,
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true });
    }

    if (event.event === 'charge.failed' || event.data?.status === 'failed') {
      const data = event.data || event;
      const reference = data.reference;
      const amount = data.amount;

      const auditId = `webhook_korapay_failed_${reference}`;
      await writeAuditOnce(auditId, {
        id: auditId,
        type: 'ticket_purchase',
        amount,
        currency: 'NGN',
        status: 'failed',
        gateway: 'korapay',
        reference,
        description: 'Korapay charge failed',
        webhookEvent: event.event || event.data?.status,
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Korapay webhook error:', error);
    return NextResponse.json({ error: error?.message || 'Webhook processing failed' }, { status: 500 });
  }
}
