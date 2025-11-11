
'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { useUser, useFirestore, useDoc, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { Event, Notification, UserTicket } from '@/lib/types';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Calendar, Clock, MapPin, Sparkles, Ticket as TicketIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { usePaystackPayment } from 'react-paystack';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

export default function EventDetailsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const eventId = params.eventId as string;

    const eventDocRef = useMemoFirebase(() => {
        if (!firestore || !eventId) return null;
        return doc(firestore, 'events', eventId);
    }, [firestore, eventId]);

    const { data: eventData, isLoading: isEventLoading } = useDoc<Event>(eventDocRef);

    const paystackConfig = useMemo(() => {
        if (!eventData || !user?.email) return null;
        return {
            reference: uuidv4(),
            email: user.email,
            amount: eventData.price * 100, // Amount in kobo
            publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
        };
    }, [eventData, user?.email]);

    const initializePayment = usePaystackPayment(paystackConfig!);

    const onPaymentSuccess = (reference: any) => {
        if (!user || !firestore || !eventData) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not process ticket. User or event data missing.',
            });
            return;
        }

        const ticketId = reference.reference;
        const ticketsCollectionRef = collection(firestore, `users/${user.uid}/tickets`);
        const newTicketRef = doc(ticketsCollectionRef, ticketId);
        
        const ticketData: Omit<UserTicket, 'event'> = {
            ticketId: ticketId,
            eventId: eventData.id,
            purchaseDate: new Date().toISOString(),
            userId: user.uid,
        };

        const notificationsCollectionRef = collection(firestore, `users/${user.uid}/notifications`);
        const notificationData: Omit<Notification, 'id'> = {
            userId: user.uid,
            title: `Ticket Purchased: ${eventData.name}`,
            description: `Your ticket for ${eventData.name} is ready.`,
            createdAt: new Date().toISOString(),
            read: false,
            link: `/events/${eventData.id}/tickets/${ticketId}`,
        }

        // Non-blocking writes to Firestore
        addDocumentNonBlocking(newTicketRef, ticketData);
        addDocumentNonBlocking(notificationsCollectionRef, notificationData);

        toast({
            title: 'Payment Successful!',
            description: 'Your ticket has been purchased.',
        });

        // Redirect to the newly created ticket page
        router.push(`/events/${eventData.id}/tickets/${ticketId}`);
    };

    const onPaymentClose = () => {
        toast({
            variant: 'destructive',
            title: 'Payment Closed',
            description: 'The payment modal was closed.',
        });
    };

    const handleBuyTicket = () => {
        if (!paystackConfig) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Payment details could not be configured. Please try again later.',
            });
            return;
        }
        if (!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY.startsWith('pk_test_xxxx')) {
            toast({
                variant: 'destructive',
                title: 'Setup Required',
                description: 'The Paystack public key is not configured in the .env file.',
            });
            return;
        }
        initializePayment({onSuccess: onPaymentSuccess, onClose: onPaymentClose});
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
    
    const formattedDate = format(new Date(eventData.date), "EEEE, MMMM d");
    const formattedTime = eventData.startTime;

    return (
        <div>
            <section className="relative w-full h-[60vh]">
                <Image
                    src={eventData.bannerUrl || 'https://picsum.photos/seed/event/1200/800'}
                    alt={eventData.name}
                    fill
                    className="object-cover"
                    data-ai-hint={eventData.name}
                    priority
                />
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
                         <Card className="p-6 sticky top-24">
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
                                <span className="font-bold text-4xl">${eventData.price.toFixed(2)}</span>
                                <span className="text-muted-foreground">/ticket</span>
                            </div>
                             <Button size="lg" className="w-full font-bold text-lg" onClick={handleBuyTicket}>
                                <TicketIcon className="mr-2 h-5 w-5" />
                                Buy Ticket
                            </Button>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
