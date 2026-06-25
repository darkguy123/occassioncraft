'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, addDoc, doc, writeBatch } from 'firebase/firestore';
import { calculatePlatformFee, calculateVendorNet } from '@/lib/payments';
import type { Ticket, Event, PaymentGateway } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, ArrowRight, Ticket as TicketIcon, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

function StatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const firestore = useFirestore();
  const processedRef = useRef(false);

  // Parse search params (supports both Paystack and Korapay parameters)
  const gatewayParam = searchParams.get('gateway') as PaymentGateway | null;
  const reference = searchParams.get('reference') || searchParams.get('trxref') || searchParams.get('transaction_id');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');
  const [detailMessage, setDetailMessage] = useState('Please do not close this window or refresh the page.');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  
  // For redirect button fallback if immediate redirect fails
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!firestore || !user || !reference || processedRef.current) return;
    processedRef.current = true;

    const verifyAndProcess = async () => {
      try {
        const gateway = gatewayParam || 'paystack';

        // 1. First, check if a ticket already exists with this transaction reference to prevent duplicates
        setMessage('Checking transaction history...');
        const existingTicketsQuery = query(
          collection(firestore, 'tickets'),
          where('transactionReference', '==', reference)
        );
        const existingSnapshot = await getDocs(existingTicketsQuery);

        if (!existingSnapshot.empty) {
          // A ticket with this reference already exists! Redirect to it immediately.
          const existingTicket = existingSnapshot.docs[0];
          const ticketId = existingTicket.id;
          const eventId = existingTicket.data().eventId;
          setMessage('Payment verified. Opening your ticket...');
          setStatus('success');
          const targetUrl = `/events/${eventId}/tickets/${ticketId}`;
          setRedirectUrl(targetUrl);
          router.replace(targetUrl);
          return;
        }

        // 2. Call backend verification endpoint
        setMessage('Verifying payment with the bank...');
        const verifyResponse = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gateway, reference }),
        });

        const verifyPayload = await verifyResponse.json();
        if (!verifyResponse.ok || !verifyPayload?.verified) {
          throw new Error(verifyPayload?.error || 'Payment verification failed.');
        }

        const gatewayMetadata = verifyPayload?.metadata || {};

        // 3. Check what kind of checkout this was
        const ticketCheckoutKey = `ticketCheckout:${reference}`;
        const vendorCheckoutKey = `vendorCheckout:${reference}`;

        const rawTicketPending = localStorage.getItem(ticketCheckoutKey);
        const rawVendorPending = localStorage.getItem(vendorCheckoutKey);

        const now = new Date().toISOString();

        if (rawTicketPending || gatewayMetadata.eventId) {
          // --- Case A: Attendee Ticket Purchase ---
          setMessage('Generating your ticket...');
          
          let eventId = gatewayMetadata.eventId;
          let category = null;

          if (rawTicketPending) {
            const pendingData = JSON.parse(rawTicketPending);
            eventId = pendingData.eventId || eventId;
            category = pendingData.category;
          }

          if (!eventId) {
            throw new Error('Event ID is missing. Cannot generate ticket.');
          }

          // Fetch event details
          const eventDocSnap = await getDocs(query(collection(firestore, 'events'), where('__name__', '==', eventId)));
          if (eventDocSnap.empty) {
            throw new Error('Event not found. Cannot associate ticket.');
          }
          const eventData = eventDocSnap.docs[0].data() as Event;

          // Reconstruct category from database templates if not found in local storage
          if (!category) {
            const ticketTemplatesQuery = query(
              collection(firestore, 'tickets'),
              where('eventId', '==', eventId),
              where('userId', '==', eventData.vendorId)
            );
            const templatesSnapshot = await getDocs(ticketTemplatesQuery);
            const packageType = gatewayMetadata.package || 'Standard';
            const templateDoc = templatesSnapshot.docs.find(d => d.data().package === packageType);
            if (templateDoc) {
              const templateData = templateDoc.data();
              category = {
                package: templateData.package,
                price: templateData.price,
                ticketImageUrl: templateData.ticketImageUrl,
              };
            } else {
              category = {
                package: packageType,
                price: (verifyPayload.amount || 0) / 100, // Safe fallback
                ticketImageUrl: '',
              };
            }
          }

          const ticketId = uuidv4();
          const price = category.price;
          const platformFeeAmount = calculatePlatformFee(price);
          const vendorNetAmount = calculateVendorNet(price);

          const newTicket: Omit<Ticket, 'id'> = {
            eventId: eventId,
            vendorId: eventData.vendorId,
            userId: user.uid,
            purchaseDate: now,
            price,
            isPaid: true,
            paystackReference: gateway === 'paystack' ? reference : undefined,
            transactionReference: reference,
            paymentGateway: gateway,
            platformFeeAmount,
            vendorNetAmount,
            package: category.package,
            ticketImageUrl: category.ticketImageUrl || '',
            attendeeName: user.displayName || 'Guest',
            scans: 0,
            maxScans: 1,
            isPrivate: eventData.isPrivate || false,
          };

          // Save ticket to general tickets collection
          await addDoc(collection(firestore, 'tickets'), { ...newTicket, id: ticketId });

          // Save pointer in user's subcollection
          await addDoc(collection(firestore, `users/${user.uid}/tickets`), {
            ticketId: ticketId,
            eventId: eventId,
            userId: user.uid,
            purchaseDate: now,
            vendorId: eventData.vendorId,
          });

          // Log transaction audit trail asynchronously
          fetch('/api/audit/log-transaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'ticket_purchase',
              vendorId: eventData.vendorId,
              userId: user.uid,
              amount: price,
              currency: 'NGN',
              status: 'completed',
              description: `Ticket purchase - ${category.package} for ${eventData.name}`,
              reference,
              gateway,
              metadata: {
                eventId,
                ticketId,
                packageType: category.package,
                platformFee: platformFeeAmount,
                vendorNet: vendorNetAmount,
              },
            }),
          }).catch(err => console.error('Audit logging failed:', err));

          // Trigger email notification asynchronously
          fetch('/api/tickets/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ticketId,
              eventId,
              userId: user.uid,
              vendorId: eventData.vendorId,
            })
          }).catch(e => console.error('Email trigger failed:', e));

          // Cleanup pending checkout state
          localStorage.removeItem(ticketCheckoutKey);

          setMessage('Success! Redirecting to your ticket details...');
          setStatus('success');
          const targetUrl = `/events/${eventId}/tickets/${ticketId}`;
          setRedirectUrl(targetUrl);
          router.replace(targetUrl);

        } else if (rawVendorPending || gatewayMetadata.itemCount) {
          // --- Case B: Vendor Publishing Checkout ---
          setMessage('Generating event ticket templates...');
          
          const rawCart = localStorage.getItem('ticketCraftCart');
          if (!rawCart) {
            throw new Error('Your cart is empty. Could not publish ticket categories.');
          }
          const cart = JSON.parse(rawCart);

          const batch = writeBatch(firestore);
          const affectedEventIds = new Set<string>();

          cart.forEach((item: any) => {
            if (item.eventId) affectedEventIds.add(item.eventId);
            const batchId = uuidv4();
            for (let i = 0; i < item.quantity; i++) {
              const ticketId = uuidv4();
              const ticketRef = doc(firestore, 'tickets', ticketId);
              const userTicketRef = doc(firestore, `users/${user.uid}/tickets`, ticketId);

              const ticketData: Omit<Ticket, 'id'> = {
                eventId: item.eventId,
                vendorId: user.uid,
                userId: user.uid,
                purchaseDate: now,
                price: item.attendeePrice || 0,
                isPaid: true,
                batchId: batchId,
                ...(gateway === 'paystack' && reference ? { paystackReference: reference } : {}),
                paymentGateway: gateway,
                transactionReference: reference,
                package: item.package,
                ticketImageUrl: item.ticketImageUrl || '',
                ticketBrandingImageUrl: item.ticketBrandingImageUrl || '',
                guestPhotoUrl: item.guestPhotoUrl || '',
                attendeeName: item.attendeeName || '',
                isPrivate: !!item.isPrivate,
                scans: 0,
                maxScans: item.maxScans || 1,
              };

              batch.set(ticketRef, ticketData);
              batch.set(userTicketRef, {
                ticketId,
                eventId: item.eventId || '',
                purchaseDate: now,
                userId: user.uid,
                vendorId: user.uid,
              });
            }
          });

          await batch.commit();

          // Clear cart
          localStorage.removeItem('ticketCraftCart');
          localStorage.removeItem(vendorCheckoutKey);

          setMessage('Success! Ticket categories published.');
          setStatus('success');
          const eventIdParam = affectedEventIds.size === 1 ? Array.from(affectedEventIds)[0] : '';
          const targetUrl = `/vendor/checkout/success?eventId=${eventIdParam}`;
          setRedirectUrl(targetUrl);
          router.replace(targetUrl);
        } else {
          throw new Error('Could not identify your purchase configuration.');
        }

      } catch (error: any) {
        console.error('Status processing error:', error);
        setStatus('error');
        setMessage('Verification Failed');
        setErrorDetails(error?.message || 'We could not verify your payment.');
      }
    };

    verifyAndProcess();
  }, [firestore, user, reference, gatewayParam, router]);

  if (status === 'loading') {
    return (
      <Card className="w-full max-w-md mx-auto border shadow-xl bg-background/50 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-indigo-500 animate-pulse" />
        <CardHeader className="text-center pt-8">
          <div className="flex justify-center mb-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">{message}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-2">
            {detailMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8 text-center space-y-2">
          <div className="text-[11px] text-muted-foreground bg-secondary/30 p-2.5 rounded-lg font-mono break-all border">
            Ref: {reference || 'Loading...'}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'success') {
    return (
      <Card className="w-full max-w-md mx-auto border shadow-xl border-green-100 bg-background/60 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-green-500" />
        <CardHeader className="text-center pt-8">
          <div className="flex justify-center mb-4 bg-green-50 p-3 rounded-full w-fit mx-auto border border-green-100">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-green-700">Payment Verified!</CardTitle>
          <CardDescription className="text-sm mt-1">
            Your transaction has been processed successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            If you are not automatically redirected, please click the button below.
          </p>
          <div className="text-[11px] text-muted-foreground bg-secondary/30 p-2.5 rounded-lg font-mono break-all border">
            Ref: {reference}
          </div>
        </CardContent>
        <CardFooter className="pb-8 pt-4">
          {redirectUrl && (
            <Button className="w-full font-bold h-12" asChild>
              <Link href={redirectUrl}>
                Go to Ticket
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto border shadow-xl border-destructive/20 bg-background/60 backdrop-blur-md relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-destructive" />
      <CardHeader className="text-center pt-8">
        <div className="flex justify-center mb-4 bg-destructive/10 p-3 rounded-full w-fit mx-auto border border-destructive/10">
          <XCircle className="h-12 w-12 text-destructive" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-destructive">Verification Failed</CardTitle>
        <CardDescription className="text-sm mt-1 text-muted-foreground">
          We encountered an issue while verifying your transaction.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-destructive/5 rounded-xl p-4 border border-destructive/10 text-sm flex gap-3 text-left">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">Error Details</p>
            <p className="text-muted-foreground mt-1 text-xs">{errorDetails || 'Unknown verification error'}</p>
          </div>
        </div>
        
        <div className="text-[11px] text-muted-foreground bg-secondary/30 p-2.5 rounded-lg font-mono break-all border">
          Ref: {reference || 'N/A'}
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          If your account has been debited, please take a screenshot of this page and contact support with your transaction reference.
        </p>
      </CardContent>
      <CardFooter className="pb-8 pt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" className="w-full font-bold h-12" asChild>
          <Link href="/">
            Go Home
          </Link>
        </Button>
        <Button className="w-full font-bold h-12" asChild>
          <Link href="/support">
            Contact Support
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function PaymentStatusPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Suspense fallback={
        <Card className="w-full max-w-md mx-auto border p-8 text-center bg-background/50 backdrop-blur-md">
          <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-semibold">Initializing status checker...</h2>
        </Card>
      }>
        <StatusContent />
      </Suspense>
    </div>
  );
}
