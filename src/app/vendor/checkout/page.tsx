
'use client';

import { useCart } from "@/context/cart-context";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { usePaystackPayment } from 'react-paystack';
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore } from "@/firebase";
import { collection, doc, writeBatch } from "firebase/firestore";
import Link from "next/link";
import { v4 as uuidv4 } from 'uuid';
import { ShoppingCart, Trash2 } from "lucide-react";
import type { Ticket } from "@/lib/types";

export default function CheckoutPage() {
    const { cart, removeFromCart, clearCart, cartTotal } = useCart();
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();

    const paystackConfig = {
        reference: uuidv4(),
        email: user?.email || '',
        amount: cartTotal * 100, // Amount in kobo
        currency: 'NGN',
        publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
    };
    
    const initializePayment = usePaystackPayment(paystackConfig);

    const onPaymentSuccess = async (reference: any) => {
        if (!firestore || !user) {
            toast({ variant: 'destructive', title: 'Error', description: 'Database connection failed.' });
            return;
        }

        const batch = writeBatch(firestore);
        
        cart.forEach(item => {
            for (let i = 0; i < item.quantity; i++) {
                const ticketId = uuidv4();
                const ticketRef = doc(firestore, 'tickets', ticketId);
                const userTicketRef = doc(firestore, `users/${user.uid}/tickets`, ticketId);
                
                const ticketData: Omit<Ticket, 'id'> = {
                    eventId: item.eventId,
                    vendorId: user.uid,
                    userId: user.uid, // Initially assigned to the vendor
                    purchaseDate: new Date().toISOString(),
                    price: item.price / item.quantity, // Price per ticket
                    isPaid: true,
                    package: item.package,
                    tier: item.tier,
                    templateId: item.templateId,
                    ticketImageUrl: item.ticketImageUrl,
                    ticketBrandingImageUrl: item.ticketBrandingImageUrl,
                    guestPhotoUrl: item.guestPhotoUrl,
                    class: item.class,
                    attendeeName: item.attendeeName,
                    isPrivate: item.isPrivate,
                    scans: 0,
                    maxScans: item.maxScans,
                };
                 batch.set(ticketRef, ticketData);
                 batch.set(userTicketRef, { ticketId: ticketId, eventId: item.eventId, purchaseDate: new Date().toISOString(), userId: user.uid, vendorId: user.uid });
            }
        });

        try {
            await batch.commit();
            toast({
                title: 'Payment Successful!',
                description: 'Your tickets have been created and are available in your dashboard.',
            });
            clearCart();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Ticket Creation Failed',
                description: 'Payment was successful, but we failed to create the tickets. Please contact support.',
            });
            console.error('Failed to commit ticket batch:', error);
        }
    };

    const onPaymentClose = () => {
        toast({
            variant: 'destructive',
            title: 'Payment Closed',
            description: 'The payment modal was closed.',
        });
    };
    
    const handleCheckout = () => {
        if (cart.length === 0) {
            toast({ variant: 'destructive', title: 'Your cart is empty!' });
            return;
        }
        if (!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY.startsWith('pk_test_')) {
            toast({
                variant: 'destructive',
                title: 'Setup Required',
                description: 'The Paystack public key is not configured in the .env file.',
            });
            return;
        }
        initializePayment({onSuccess: onPaymentSuccess, onClose: onPaymentClose});
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="space-y-2 mb-8">
                <h1 className="text-3xl font-bold tracking-tight">My Cart</h1>
                <p className="text-muted-foreground">Review your ticket batches and proceed to payment.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Items</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {cart.length > 0 ? (
                                <div className="divide-y">
                                {cart.map(item => (
                                    <div key={item.id} className="p-4 flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">{item.quantity} x {item.package} {item.tier || ''} Tickets</p>
                                            <p className="text-sm text-muted-foreground">For: {item.eventName}</p>
                                            <p className="text-sm font-bold text-primary">₦{item.price.toLocaleString()}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                                </div>
                            ) : (
                                <div className="p-12 text-center text-muted-foreground">
                                    <ShoppingCart className="h-12 w-12 mx-auto mb-4" />
                                    <p>Your cart is empty.</p>
                                    <Button variant="link" asChild><Link href="/create-ticket">Start crafting tickets</Link></Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-1">
                    <Card className="sticky top-24">
                        <CardHeader>
                            <CardTitle>Order Summary</CardTitle>
                            <CardDescription>Final prices before payment.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           {cart.map(item => (
                                <div key={item.id} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground truncate">{item.quantity}x {item.package}</span>
                                    <span className="font-medium">₦{item.price.toLocaleString()}</span>
                                </div>
                           ))}
                           <Separator />
                           <div className="flex justify-between text-lg font-bold">
                                <span>Total</span>
                                <span>₦{cartTotal.toLocaleString()}</span>
                           </div>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" size="lg" onClick={handleCheckout} disabled={cart.length === 0}>
                                Proceed to Payment (₦{cartTotal.toLocaleString()})
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>

        </div>
    )
}
