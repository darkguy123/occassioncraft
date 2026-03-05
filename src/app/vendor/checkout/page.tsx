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
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from 'uuid';
import { ShoppingCart, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import type { Ticket, Event } from "@/lib/types";
import { useState, useCallback } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isBefore, startOfToday } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CheckoutPage() {
    const { cart, removeFromCart, clearCart, cartTotal } = useCart();
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);

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
        amount: Math.round(cartTotal * 100), // Total of platform fees
        currency: 'NGN',
        publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
    };

    const initializePayment = usePaystackPayment(paystackConfig);

    const onPaymentSuccess = useCallback(async (reference: any) => {
        if (!firestore || !user) {
            toast({ variant: 'destructive', title: 'Error', description: 'Session expired. Please log in again.' });
            return;
        }

        setIsProcessing(true);
        const batch = writeBatch(firestore);
        const now = new Date().toISOString();
        
        // Generate a ticket for each item in each batch category
        cart.forEach(item => {
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
                    price: item.attendeePrice,
                    isPaid: true,
                    batchId: batchId,
                    package: (item.package as any),
                    ticketImageUrl: item.ticketImageUrl,
                    ticketBrandingImageUrl: item.ticketBrandingImageUrl,
                    guestPhotoUrl: item.guestPhotoUrl,
                    attendeeName: item.attendeeName,
                    isPrivate: item.isPrivate,
                    scans: 0,
                    maxScans: item.maxScans,
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
            router.push('/vendor/tickets');
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Critical Error',
                description: 'Payment verified, but ticket generation failed. Please contact support with reference: ' + reference.reference,
            });
            console.error('Failed to commit ticket batch:', error);
        } finally {
            setIsProcessing(false);
        }
    }, [firestore, user, cart, clearCart, toast, router]);

    const onPaymentClose = useCallback(() => {
        toast({ title: 'Checkout Cancelled' });
    }, [toast]);
    
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
        if (!paystackConfig.publicKey) {
            setCheckoutError('Payment gateway is not configured.');
            return;
        }
        
        initializePayment(onPaymentSuccess, onPaymentClose);
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
                                                <p className="text-sm text-muted-foreground">Attendee Price: {item.attendeePrice === 0 ? 'Free' : `₦${item.attendeePrice.toLocaleString()}`}</p>
                                                <p className="text-sm text-muted-foreground">Event: {item.eventName}</p>
                                                <Badge variant="outline" className="mt-2 text-primary border-primary">Platform Fee: ₦{item.price.toLocaleString()}</Badge>
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
                                        <span className="font-medium">₦{item.price.toLocaleString()}</span>
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
                                <Button className="w-full" size="lg" onClick={handleCheckout} disabled={isProcessing || cart.length === 0}>
                                    {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Processing...</> : 'Pay Now'}
                                </Button>
                                <p className="text-[10px] text-center text-muted-foreground">Secure payment powered by Paystack.</p>
                            </CardFooter>
                        </Card>
                    </div>
                </div>

            </div>
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
