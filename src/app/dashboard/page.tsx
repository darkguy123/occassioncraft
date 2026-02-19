'use client';

import { Card, CardTitle, CardDescription, CardContent, CardHeader } from "@/components/ui/card"
import { UpcomingEventCard } from '@/components/dashboard/upcoming-event-card';
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { UserTicket, Event } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UserDashboardPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const userTicketsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        // Query the subcollection that just stores the ticket IDs for the user
        return query(collection(firestore, `users/${user.uid}/tickets`));
    }, [user, firestore]);

    const { data: userTicketPointers, isLoading: ticketsLoading } = useCollection<UserTicket>(userTicketsQuery);

    const eventIds = useMemo(() => {
        if (!userTicketPointers) {
            return null; // Return null if pointers aren't loaded yet
        }
        // Get unique event IDs from the user's tickets
        const ids = userTicketPointers.map(t => t.eventId);
        return [...new Set(ids)];
    }, [userTicketPointers]);
    
    const eventsQuery = useMemoFirebase(() => {
        // Guard against null or empty eventIds array
        if (!firestore || !eventIds || eventIds.length === 0) {
            return null;
        }
        // Fetch all the events the user has tickets for in a single query
        return query(collection(firestore, 'events'), where('__name__', 'in', eventIds));
    }, [firestore, eventIds]);

    const { data: events, isLoading: eventsLoading } = useCollection<Event>(eventsQuery);
    
    const myEvents = useMemo(() => {
        if (!userTicketPointers || !events) return [];
        // Map the ticket pointers to their corresponding event data
        return userTicketPointers.map(ticket => {
            const event = events.find(e => e.id === ticket.eventId);
            return { ...ticket, event };
        }).filter(item => item.event); // Filter out items where event was not found
    }, [userTicketPointers, events]);
    
    const isLoading = isUserLoading || ticketsLoading || (eventIds && eventIds.length > 0 && eventsLoading);

  return (
    <div className="container mx-auto max-w-7xl py-12 px-4">
      <div className="space-y-2 mb-8">
        <h1 className="text-4xl font-bold font-headline">My Tickets</h1>
        <p className="text-muted-foreground">All your upcoming events in one place.</p>
      </div>

      <div className="space-y-8">
        {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden bg-card/60 backdrop-blur-sm rounded-xl">
                        <Skeleton className="h-48 w-full" />
                        <div className="p-6 space-y-4">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-4 w-1/2" />
                            <div className="flex justify-between items-center pt-4 border-t">
                                <Skeleton className="h-6 w-1/4" />
                                <Skeleton className="h-10 w-1/3" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        ) : myEvents.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myEvents.map(item => (
                    <UpcomingEventCard key={item.ticketId} event={item.event!} ticket={item}/>
                ))}
            </div>
        ) : (
            <Card className="text-center p-12 bg-card/80 backdrop-blur-sm border-2 border-dashed">
                <CardHeader>
                    <CardTitle>No Tickets Yet</CardTitle>
                    <CardDescription className="mt-2">When you purchase tickets for an event, they will appear here.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Button asChild>
                        <Link href="/events">Discover Events</Link>
                    </Button>
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
