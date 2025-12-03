
'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking, useCollection } from '@/firebase';
import { doc, collection, query, where, limit } from 'firebase/firestore';
import type { Event, Notification, UserTicket, Ticket } from '@/lib/types';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Calendar, Clock, Lock, MapPin, Sparkles, Ticket as TicketIcon, Info } from 'lucide-react';
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
} from "@/components/ui/alert-dialog"

export default function EventDetailsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const eventId = params.eventId as string;

    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [alertContent, setAlertContent] = useState({ title: '', description: '' });

    const eventDocRef = useMemoFirebase(() => {
        if (!firestore || !eventId) return null;
        return doc(firestore, 'events', eventId);
    }, [firestore, eventId]);

    const { data: eventData, isLoading: isEventLoading } = useDoc<Event>(eventDocRef);

    const ticketsQuery = useMemoFirebase(() => {
        if (!firestore || !eventId) return null;
        return query(collection(firestore, 'tickets'), where('eventId', '==', eventId), where('isPrivate', '==', false), limit(1));
    }, [firestore, eventId]);

    const { data: publicTickets, isLoading: areTicketsLoading } = useCollection(ticketsQuery);

    const isLoading = isEventLoading || areTicketsLoading;

    const handleGetTicket = () => {
        if (!user) {
            router.push('/login?redirect=/events/' + eventId);
            return;
        }

        if (eventData?.isPrivate) {
            setAlertContent({
                title: 'Private Event',
                description: 'This event is private and strictly by invitation. You cannot claim tickets directly.'
            });
            setIsAlertOpen(true);
            return;
        }

        if (!publicTickets || publicTickets.length === 0) {
            setAlertContent({
                title: 'No Tickets Available',
                description: 'There are no public tickets available for this event yet. Please check back later.'
            });
            setIsAlertOpen(true);
            return;
        }
        
        // If public tickets are available, we would redirect to a page where user can select one.
        // For now, let's just log it. A future implementation could show a ticket selection modal.
        toast({
            title: "Redirecting...",
            description: "Showing available public tickets for this event."
        });
        // In a real scenario, you might have a dedicated page for purchasing from available ticket types.
        // router.push(`/events/${eventId}/purchase`);
    };

    if (isLoading) {
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
        <>
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Info className="h-5 w-5" /> {alertContent.title}
                        </AlertDialogTitle>
                        <AlertDialogDescription>{alertContent.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogAction onClick={() => setIsAlertOpen(false)}>
                        OK
                    </AlertDialogAction>
                </AlertDialogContent>
            </AlertDialog>
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
                                <Button size="lg" className="w-full font-bold text-lg" onClick={handleGetTicket}>
                                    <TicketIcon className="mr-2 h-5 w-5" />
                                    Get Tickets
                                </Button>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
