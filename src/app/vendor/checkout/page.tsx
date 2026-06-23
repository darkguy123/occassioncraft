'use client';

import { useCart } from "@/context/cart-context";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { usePaystackPayment } from 'react-paystack';
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, writeBatch, query, where } from "firebase/firestore";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from 'uuid';
import { ShoppingCart, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import type { Ticket, Event, PaymentGateway } from "@/lib/types";
import { useState, useCallback, useEffect, useRef } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isBefore, startOfToday } from "date-fns";
import { getPaystackPublicKey } from "@/lib/payment-public-config";
import Image from "next/image";
import {
  AlertDialog,
  AlertDialogAction,
    AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
    AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

export default function CheckoutPage() {
    const { cart, removeFromCart, clearCart, cartTotal } = useCart();
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const processedReferenceRef = useRef<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [isGatewayDialogOpen, setIsGatewayDialogOpen] = useState(false);
    const [selectedGateway, setSelectedGateway] = useState<PaymentGateway>('paystack');

    const [isExpiredAlertOpen, setIsExpiredAlertOpen] = useState(false);
    const [expiredEventDetails, setExpiredEventDetails] = useState<{name: string, date: string} | null>(null);

    const vendorEventsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'events'), where('vendorId', '==', user.uid));
    }, [user, firestore]);
    const { data: vendorEvents } = useCollection<Event>(vendorEventsQuery);
    
    const paystackConfig = {
        reference: uuidv4(),
        email: user?.email || '',
        amount: Math.round(cartTotal * 100), // Total of platform fees in Kobo
        currency: 'NGN',
        publicKey: getPaystackPublicKey(),
    };

    const initializePayment = usePaystackPayment(paystackConfig);

    useEffect(() => {
        const savedGateway = window.localStorage.getItem('vendorCheckout:lastGateway');
        if (savedGateway === 'paystack' || savedGateway === 'korapay') {
            setSelectedGateway(savedGateway);
        }
    }, []);

    const completeCheckout = useCallback(async (reference: string, gateway: PaymentGateway) => {
        if (!firestore || !user) {
            toast({ variant: 'destructive', title: 'Error', description: 'Session expired. Please log in again.' });
            return;
        }

        setIsProcessing(true);
        const batch = writeBatch(firestore);
        const now = new Date().toISOString();
        
        // Track unique event IDs for the success page
        const affectedEventIds = new Set<string>();

        // Process each item in the cart
        cart.forEach(item => {
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
                    package: (item.package as any),
                    ticketImageUrl: item.ticketImageUrl,
                    ticketBrandingImageUrl: item.ticketBrandingImageUrl,
                    guestPhotoUrl: item.guestPhotoUrl,
                    attendeeName: item.attendeeName,
                    isPrivate: !!item.isPrivate,
                    scans: 0,
                    maxScans: item.maxScans || 1,
                };

                 batch.set(ticketRef, ticketData);
                 batch.set(userTicketRef, { 
                    ticketId: ticketId, 
                    eventId: item.eventId || '', 
                    purchaseDate: now, 
                    userId: user.uid, 
                    vendorId: user.uid 
                });
            }
        });

        try {
            await batch.commit();
            toast({
                title: 'Success!',
                description: 'Your tickets have been generated and published.',
            });
            clearCart();
            
            // Redirect to success page with event context
            const eventIdParam = affectedEventIds.size === 1 ? Array.from(affectedEventIds)[0] : '';
            router.push(`/vendor/checkout/success?eventId=${eventIdParam}`);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Critical Error',
                description: 'Payment verified, but ticket generation failed. Please contact support with reference: ' + reference,
            });
            console.error('Failed to commit ticket batch:', error);
        } finally {
            setIsProcessing(false);
        }
    }, [firestore, user, cart, clearCart, toast, router]);

    const onPaymentSuccess = useCallback(async (reference: any) => {
        if (reference?.status !== 'success' || !reference?.reference) {
            toast({ 
                variant: 'destructive', 
                title: 'Payment Verification Failed', 
                description: 'The payment was not successfully processed by the gateway.' 
            });
            return;
        }

        await completeCheckout(reference.reference, 'paystack');
    }, [completeCheckout, toast]);

    const onPaymentClose = useCallback(() => {
        setIsProcessing(false);
        toast({ title: 'Checkout Cancelled' });
    }, [toast]);

    const startGatewayCheckout = async (gateway: PaymentGateway) => {
        if (!user || cart.length === 0) return;

        setSelectedGateway(gateway);
        window.localStorage.setItem('vendorCheckout:lastGateway', gateway);
        setCheckoutError(null);
        setIsGatewayDialogOpen(false);

        if (gateway === 'paystack') {
            if (!paystackConfig.publicKey) {
                setCheckoutError('Payment gateway is not configured. Set NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY (or PAYSTACK_PUBLIC_KEY) and redeploy.');
                return;
            }

            setIsProcessing(true);
            initializePayment(onPaymentSuccess, onPaymentClose);
            return;
        }

        setIsProcessing(true);
        try {
            const callbackUrl = `${window.location.origin}/payments/status?gateway=korapay`;
            const response = await fetch('/api/payments/initialize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gateway,
                    amount: cartTotal,
                    email: user.email,
                    callbackUrl,
                    metadata: {
                        userId: user.uid,
                        itemCount: cart.length,
                    },
                }),
            });

            const payload = await response.json();
            if (!response.ok || !payload?.checkoutUrl || !payload?.reference) {
                throw new Error(payload?.error || 'Failed to initialize payment checkout.');
            }

            localStorage.setItem(`vendorCheckout:${payload.reference}`, JSON.stringify({ gateway }));
            window.location.assign(payload.checkoutUrl);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Payment Error',
                description: error?.message || 'Could not start payment. Please try again.',
            });
            setIsProcessing(false);
        }
    };
    
    const handleCheckout = () => {
        setCheckoutError(null);
        
        if (vendorEvents) {
            for (const item of cart) {
                if (!item.eventId) continue; 
                const event = vendorEvents.find(e => e.id === item.eventId);
                if (event && event.dates && event.dates.length > 0) {
                    const lastDate = event.dates[event.dates.length - 1];
                    if (isBefore(new Date(lastDate.date), startOfToday())) {
                        setExpiredEventDetails({ name: event.name, date: lastDate.date });
                        setIsExpiredAlertOpen(true);
                        return;
                    }
                }
            }
        }

        if (cart.length === 0) return;
        setIsGatewayDialogOpen(true);
    }

    return (
        <>
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="space-y-2 mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
                    <p className="text-muted-foreground">Pay service fees to publish your ticket categories.</p>
                </div>
                
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="md:col-span-2">
                        <Card>
                            <CardHeader><CardTitle>Publishing Cart</CardTitle></CardHeader>
                            <CardContent className="p-0">
                                {cart.length > 0 ? (
                                    <div className="divide-y">
                                    {cart.map(item => (
                                        <div key={item.id} className="p-4 flex justify-between items-start">
                                            <div className="space-y-1">
                                                <p className="font-semibold text-lg">{item.quantity} x {item.package} Tickets</p>
                                                <p className="text-sm text-muted-foreground">Attendee Price: {(item.attendeePrice === 0 || item.attendeePrice === undefined) ? 'Free' : `₦${item.attendeePrice.toLocaleString()}`}</p>
                                                <p className="text-sm text-muted-foreground">Event: {item.eventName}</p>
                                                <Badge variant="outline" className="mt-2 text-primary border-primary">Platform Fee: ₦{(item.price ?? 0).toLocaleString()}</Badge>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)} disabled={isProcessing}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    ))}
                                    </div>
                                ) : (
                                    <div className="p-12 text-center text-muted-foreground">
                                        <ShoppingCart className="h-12 w-12 mx-auto mb-4" />
                                        <p className="mb-4">Your cart is empty.</p>
                                        <Button asChild><Link href="/create-ticket">Add a Category</Link></Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                    <div className="md:col-span-1">
                        <Card className="sticky top-24">
                            <CardHeader>
                                <CardTitle>Payment Summary</CardTitle>
                                <CardDescription>Charges based on categories added.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                            {cart.map(item => (
                                    <div key={item.id} className="flex justify-between text-sm">
                                        <span className="text-muted-foreground truncate">{item.package} category</span>
                                        <span className="font-medium">₦{(item.price ?? 0).toLocaleString()}</span>
                                    </div>
                            ))}
                            <Separator />
                            <div className="flex justify-between text-xl font-bold">
                                    <span>Total Fee</span>
                                    <span className="text-primary">₦{cartTotal.toLocaleString()}</span>
                            </div>
                            </CardContent>
                            <CardFooter className="flex-col items-stretch gap-4">
                                {checkoutError && (
                                    <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>{checkoutError}</AlertDescription>
                                    </Alert>
                                )}
                                <div className="flex items-center gap-2">
                                    <Button className="w-full" size="lg" onClick={handleCheckout} disabled={isProcessing || cart.length === 0}>
                                        {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Processing...</> : 'Pay Now'}
                                    </Button>
                                    <Badge variant="secondary" className="shrink-0 text-[10px] tracking-wide whitespace-nowrap">
                                        Selected: {selectedGateway.charAt(0).toUpperCase() + selectedGateway.slice(1)}
                                    </Badge>
                                </div>
                                <p className="text-[10px] text-center text-muted-foreground">Secure payment powered by Paystack or Korapay.</p>
                            </CardFooter>
                        </Card>
                    </div>
                </div>

            </div>
            <AlertDialog open={isGatewayDialogOpen} onOpenChange={setIsGatewayDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Select Payment Gateway</AlertDialogTitle>
                        <AlertDialogDescription>Choose the gateway you want to use for this checkout.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="grid gap-3 py-2">
                        <button
                            type="button"
                            className={`w-full rounded-md border p-3 hover:bg-muted/50 transition-colors text-left ${selectedGateway === 'paystack' ? 'border-primary bg-primary/5' : ''}`}
                            onClick={() => startGatewayCheckout('paystack')}
                            disabled={isProcessing}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Image src="/images/paystack-logo.svg" alt="Paystack logo" width={92} height={22} />
                                    <span className="text-sm text-muted-foreground">Fast card and bank payments</span>
                                </div>
                            </div>
                        </button>
                        <button
                            type="button"
                            className={`w-full rounded-md border p-3 hover:bg-muted/50 transition-colors text-left ${selectedGateway === 'korapay' ? 'border-primary bg-primary/5' : ''}`}
                            onClick={() => startGatewayCheckout('korapay')}
                            disabled={isProcessing}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Image src="/images/korapay-logo.svg" alt="Korapay logo" width={92} height={22} />
                                    <span className="text-sm text-muted-foreground">Pay with cards and transfers</span>
                                </div>
                            </div>
                        </button>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={isExpiredAlertOpen} onOpenChange={setIsExpiredAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Event Expired</AlertDialogTitle>
                        <AlertDialogDescription>The event "{expiredEventDetails?.name}" has already taken place. Please remove these items to continue.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogAction onClick={() => setIsExpiredAlertOpen(false)}>I Understand</AlertDialogAction>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
