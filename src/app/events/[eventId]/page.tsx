'use client';

import { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, addDoc } from 'firebase/firestore';
import type { Event, Ticket, TicketCategory } from '@/lib/types';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { AlertTriangle, Calendar, Clock, Lock, MapPin, Ticket as TicketIcon, Info, Check, Loader2, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { usePaystackPayment } from 'react-paystack';
import { v4 as uuidv4 } from 'uuid';

export default function EventDetailsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const eventId = params.eventId as string;

    const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const eventDocRef = useMemoFirebase(() => {
        if (!firestore || !eventId) return null;
        return doc(firestore, 'events', eventId);
    }, [firestore, eventId]);

    const { data: eventData, isLoading: isEventLoading } = useDoc<Event>(eventDocRef);

    // Fetch tickets to determine available categories and prices
    const ticketsQuery = useMemoFirebase(() => {
        if (!firestore || !eventId) return null;
        return query(collection(firestore, 'tickets'), where('eventId', '==', eventId));
    }, [firestore, eventId]);

    const { data: eventTickets, isLoading: isTicketsLoading } = useCollection<Ticket>(ticketsQuery);

    const availableCategories = useMemo(() => {
        if (!eventTickets) return [];
        // Group by package and price to show unique categories
        const groups: Record<string, { package: TicketCategory, price: number, ticketImageUrl?: string }> = {};
        eventTickets.forEach(t => {
            const key = `${t.package}-${t.price}`;
            if (!groups[key]) {
                groups[key] = { package: t.package, price: t.price, ticketImageUrl: t.ticketImageUrl };
            }
        });
        return Object.values(groups).sort((a, b) => a.price - b.price);
    }, [eventTickets]);

    const handlePurchaseSuccess = async (reference?: any) => {
        if (!user || !firestore || !eventData || !selectedCategory) return;

        // If a reference is provided (from Paystack), check its status
        if (reference && reference.status !== 'success') {
            toast({ 
                variant: 'destructive', 
                title: "Payment Not Verified", 
                description: "The payment gateway did not return a success status." 
            });
            return;
        }

        setIsProcessing(true);
        const ticketId = uuidv4();
        const now = new Date().toISOString();

        const newTicket: Omit<Ticket, 'id'> = {
            eventId: eventId,
            vendorId: eventData.vendorId,
            userId: user.uid,
            purchaseDate: now,
            price: selectedCategory.price,
            isPaid: true,
            paystackReference: reference?.reference || 'FREE_CLAIM',
            package: selectedCategory.package,
            ticketImageUrl: selectedCategory.ticketImageUrl || '',
            attendeeName: user.displayName || 'Guest',
            scans: 0,
            maxScans: 1,
            isPrivate: eventData.isPrivate || false,
        };

        try {
            await addDoc(collection(firestore, 'tickets'), { ...newTicket, id: ticketId });
            // Pointer for user collection
            await addDoc(collection(firestore, `users/${user.uid}/tickets`), {
                ticketId: ticketId,
                eventId: eventId,
                userId: user.uid,
                purchaseDate: now,
                vendorId: eventData.vendorId
            });

            // Trigger email notification asynchronously
            fetch('/api/tickets/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticketId,
                    eventId,
                    userId: user.uid,
                    vendorId: eventData.vendorId
                })
            }).catch(e => console.error("Email notify trigger failed:", e));

            toast({ title: "Purchase Successful!", description: "Your ticket is ready." });
            router.push(`/events/${eventId}/tickets/${ticketId}`);
        } catch (error: any) {
            console.error("Error creating ticket:", error);
            toast({ 
                variant: 'destructive', 
                title: "Purchase Error", 
                description: "Transaction was verified but ticket generation failed. Reference: " + (reference?.reference || 'N/A')
            });
        } finally {
            setIsProcessing(false);
            setIsPurchaseDialogOpen(false);
        }
    };

    const paystackConfig = {
        reference: uuidv4(),
        email: user?.email || '',
        amount: Math.round((selectedCategory?.price || 0) * 100), // in Kobo
        currency: 'NGN',
        publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
    };

    const initializePayment = usePaystackPayment(paystackConfig);

    const handleGetTicket = () => {
        if (!user) {
            router.push(`/login?redirect=/events/${eventId}`);
            return;
        }
        setIsPurchaseDialogOpen(true);
    };

    const onConfirmPurchase = () => {
        if (!selectedCategory) return;
        
        if (selectedCategory.price === 0) {
            handlePurchaseSuccess();
        } else {
            if (!paystackConfig.publicKey) {
                toast({ variant: 'destructive', title: 'Payment Error', description: 'Payment gateway is not configured.' });
                return;
            }
            initializePayment(handlePurchaseSuccess, () => toast({ title: 'Payment Cancelled' }));
        }
    };

    if (isEventLoading) {
        return (
            <div className="container mx-auto max-w-4xl py-12 px-4 space-y-8">
                <Skeleton className="h-96 w-full rounded-2xl" />
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-4">
                        <Skeleton className="h-10 w-3/4" />
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                    <div className="space-y-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (!eventData) {
        return (
            <div className="container mx-auto max-w-lg py-12 px-4">
                <Card className="p-8 text-center bg-destructive/10 border-destructive">
                    <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-destructive-foreground">Event Not Found</h2>
                    <p className="text-destructive-foreground/80 mt-2">
                        We couldn't find the event you're looking for. It may have been moved or deleted.
                    </p>
                </Card>
            </div>
        );
    }
    
    const renderDateInfo = () => {
        if (!eventData.dates || eventData.dates.length === 0) {
            return { formattedDate: 'Date not set', formattedTime: 'Time not set' };
        }
        const firstDateItem = eventData.dates[0];
        let formattedDate = format(new Date(firstDateItem.date), "EEEE, MMMM d");
        let formattedTime = firstDateItem.startTime;
        
        if (eventData.dates.length > 1) {
            const lastDateItem = eventData.dates[eventData.dates.length - 1];
            const firstDate = new Date(firstDateItem.date);
            const lastDate = new Date(lastDateItem.date);

            if (firstDate.toDateString() !== lastDate.toDateString()) {
                 formattedDate = `${format(firstDate, "MMM d")} - ${format(lastDate, "MMM d, yyyy")}`;
            }
            formattedTime = "Multiple times";
        }
        return { formattedDate, formattedTime };
    };

    const { formattedDate, formattedTime } = renderDateInfo();

    return (
        <>
            <AlertDialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Select Your Ticket</AlertDialogTitle>
                        <AlertDialogDescription>Choose a category to attend {eventData.name}.</AlertDialogDescription>
                    </AlertDialogHeader>
                    
                    <div className="grid gap-4 py-4">
                        {isTicketsLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                            </div>
                        ) : availableCategories.length > 0 ? (
                            availableCategories.map((cat, idx) => (
                                <div 
                                    key={idx}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center ${selectedCategory === cat ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/50'}`}
                                    onClick={() => setSelectedCategory(cat)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${selectedCategory === cat ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                                            {selectedCategory === cat && <Check className="h-3 w-3 text-white" />}
                                        </div>
                                        <div>
                                            <p className="font-bold">{cat.package}</p>
                                            <p className="text-xs text-muted-foreground">Standard Entry</p>
                                        </div>
                                    </div>
                                    <p className="font-bold text-lg">
                                        {cat.price === 0 ? 'FREE' : `₦${cat.price.toLocaleString()}`}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <Info className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                <p>No ticket categories available for this event yet.</p>
                            </div>
                        )}
                    </div>

                    <AlertDialogFooter className="grid grid-cols-2 gap-2">
                        <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
                        <Button 
                            onClick={onConfirmPurchase} 
                            disabled={!selectedCategory || isProcessing}
                            className="font-bold"
                        >
                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                            {selectedCategory?.price === 0 ? 'Claim Free Ticket' : 'Purchase Ticket'}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div>
                <section className="relative w-full h-[60vh] bg-secondary">
                    {eventData.bannerUrl && (
                        <Image
                            src={eventData.bannerUrl}
                            alt={eventData.name}
                            fill
                            className="object-cover"
                            priority
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    <div className="relative z-10 flex flex-col items-start justify-end h-full p-8 md:p-12 container mx-auto">
                        <h1 className="text-4xl md:text-6xl font-headline font-bold text-white shadow-lg">{eventData.name}</h1>
                        <p className="text-lg text-white/90 mt-2 shadow-md">Hosted by {eventData.organizer || 'the organizer'}</p>
                    </div>
                </section>

                <div className="container mx-auto max-w-5xl py-12 px-4">
                    <div className="grid md:grid-cols-3 gap-8 md:gap-12">
                        <div className="md:col-span-2">
                            <h2 className="font-headline text-2xl font-bold mb-4">About this event</h2>
                            <p className="text-muted-foreground whitespace-pre-wrap">{eventData.description || 'No description provided.'}</p>
                        </div>
                        <div className="md:row-start-1 md:col-start-3">
                            <Card className="p-6 sticky top-24 shadow-xl border-t-4 border-t-primary">
                                <div className="space-y-4 text-sm">
                                    <div className="flex items-center">
                                        <Calendar className="h-5 w-5 mr-3 text-primary" />
                                        <span className="font-medium text-lg">{formattedDate}</span>
                                    </div>
                                    <div className="flex items-center text-muted-foreground">
                                        <Clock className="h-4 w-4 mr-3.5 ml-0.5" />
                                        <span>{formattedTime}</span>
                                    </div>
                                    <div className="flex items-center text-muted-foreground">
                                        <MapPin className="h-4 w-4 mr-3.5 ml-0.5" />
                                        <span>{eventData.isOnline ? 'Online Event' : eventData.location}</span>
                                    </div>
                                </div>
                                <div className="my-6 text-center">
                                {eventData.isPrivate ? (
                                    <div className="flex flex-col items-center gap-2 text-amber-600">
                                        <Lock className="h-8 w-8" />
                                        <span className="font-bold text-xl">Private Event</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <TicketIcon className="h-8 w-8 text-primary" />
                                        <span className="font-bold text-xl">Tickets Available</span>
                                    </div>
                                )}
                                </div>
                                <Button size="lg" className="w-full font-bold text-lg h-14" onClick={handleGetTicket} disabled={isTicketsLoading || availableCategories.length === 0}>
                                    <TicketIcon className="mr-2 h-5 w-5" />
                                    Get Tickets
                                </Button>
                                {availableCategories.length === 0 && !isTicketsLoading && (
                                    <p className="text-[10px] text-center text-muted-foreground mt-2 italic">Sales haven't started yet.</p>
                                )}
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
