import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      type,
      vendorId,
      userId,
      amount,
      currency,
      status,
      description,
      reference,
      gateway,
      metadata,
    } = body;

    if (!type || !amount || !currency || !status || !description) {
      return NextResponse.json({ error: 'Missing required audit fields.' }, { status: 400 });
    }

    const auditId = uuidv4();
    await adminDb.collection('transactionAudits').doc(auditId).set({
      id: auditId,
      type,
      vendorId: vendorId || null,
      userId: userId || null,
      amount,
      currency,
      status,
      description,
      reference: reference || null,
      gateway: gateway || null,
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      auditId,
    });
  } catch (error: any) {
    console.error('Audit logging error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to log transaction.' },
      { status: 500 }
    );
  }
}
