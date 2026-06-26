import { adminDb, adminAuth } from './firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { calculatePlatformFee, calculateVendorNet } from './payments';

export interface ProcessAttendeeTicketArgs {
  reference: string;
  eventId: string;
  userId: string;
  packageName: string;
  amountPaid: number;
  gateway: 'paystack' | 'korapay';
}

export async function processAttendeeTicket({
  reference,
  eventId,
  userId,
  packageName,
  amountPaid,
  gateway,
}: ProcessAttendeeTicketArgs): Promise<string> {
  // 1. Check if a ticket already exists for this reference
  const existingTickets = await adminDb
    .collection('tickets')
    .where('transactionReference', '==', reference)
    .limit(1)
    .get();

  if (!existingTickets.empty) {
    const existingTicket = existingTickets.docs[0];
    return existingTicket.id;
  }

  // 2. Fetch event details
  const eventDoc = await adminDb.collection('events').doc(eventId).get();
  if (!eventDoc.exists) {
    throw new Error(`Event not found: ${eventId}`);
  }
  const eventData = eventDoc.data()!;

  // 3. Fetch buyer details for attendeeName
  let attendeeName = 'Guest';
  try {
    const userRecord = await adminAuth.getUser(userId);
    attendeeName = userRecord.displayName || userRecord.email?.split('@')[0] || 'Guest';
  } catch (error) {
    console.warn(`Could not fetch auth user details for ${userId}, fallback to Guest.`, error);
  }

  // 4. Resolve category details from templates
  const vendorId = eventData.vendorId;
  const ticketsQuery = await adminDb
    .collection('tickets')
    .where('eventId', '==', eventId)
    .where('userId', '==', vendorId)
    .get();

  let ticketImageUrl = '';
  let finalPrice = amountPaid;

  const templateDoc = ticketsQuery.docs.find((d) => d.data().package === packageName);
  if (templateDoc) {
    const templateData = templateDoc.data();
    finalPrice = templateData.price ?? finalPrice;
    ticketImageUrl = templateData.ticketImageUrl || '';
  }

  const platformFeeAmount = calculatePlatformFee(finalPrice);
  const vendorNetAmount = calculateVendorNet(finalPrice);
  const now = new Date().toISOString();
  const ticketId = uuidv4();

  const ticketData = {
    id: ticketId,
    eventId,
    vendorId,
    userId,
    purchaseDate: now,
    price: finalPrice,
    isPaid: true,
    ...(gateway === 'paystack' ? { paystackReference: reference } : {}),
    transactionReference: reference,
    paymentGateway: gateway,
    platformFeeAmount,
    vendorNetAmount,
    package: packageName,
    ticketImageUrl,
    attendeeName,
    scans: 0,
    maxScans: 1,
    isPrivate: eventData.isPrivate || false,
  };

  // 5. Create ticket using batch for consistency
  const batch = adminDb.batch();
  
  const ticketRef = adminDb.collection('tickets').doc(ticketId);
  const userTicketRef = adminDb.collection('users').doc(userId).collection('tickets').doc(ticketId);

  batch.set(ticketRef, ticketData);
  batch.set(userTicketRef, {
    ticketId,
    eventId,
    userId,
    purchaseDate: now,
    vendorId,
  });

  await batch.commit();

  // 6. Log transaction audit trail asynchronously
  const auditId = `audit_${reference}_${ticketId}`;
  adminDb.collection('transactionAudits').doc(auditId).set({
    id: auditId,
    type: 'ticket_purchase',
    vendorId,
    userId,
    amount: finalPrice,
    currency: 'NGN',
    status: 'completed',
    description: `Ticket purchase - ${packageName} for ${eventData.name}`,
    reference,
    gateway,
    metadata: {
      eventId,
      ticketId,
      packageType: packageName,
      platformFee: platformFeeAmount,
      vendorNet: vendorNetAmount,
    },
    createdAt: now,
  }).catch((err) => console.error('Background transaction auditing failed:', err));

  // 7. Trigger email notification asynchronously by hitting the local endpoint
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
  fetch(`${baseUrl}/api/tickets/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticketId,
      eventId,
      userId,
      vendorId,
    }),
  }).catch((err) => console.error('Background email dispatch failed:', err));

  return ticketId;
}
