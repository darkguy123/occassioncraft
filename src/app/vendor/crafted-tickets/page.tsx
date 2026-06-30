'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Palette, Ticket } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Ticket as TicketType, Event as EventType } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isBefore, startOfToday } from 'date-fns';
import TicketCard from '@/components/ticket-card';

export default function AllVendorCraftedTicketsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const ticketsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'tickets'),
      where('vendorId', '==', user.uid),
      where('userId', '==', user.uid),
      orderBy('purchaseDate', 'desc')
    );
  }, [firestore, user]);

  const { data: tickets, isLoading: areTicketsLoading } = useCollection<TicketType>(ticketsQuery);
  
  const eventIds = useMemo(() => {
    if (!tickets) return [];
    const ids = tickets.map(t => t.eventId).filter((id): id is string => !!id);
    return [...new Set(ids)];
  }, [tickets]);

  const eventsQuery = useMemoFirebase(() => {
    if (!firestore || eventIds.length === 0) return null;
    return query(collection(firestore, 'events'), where('__name__', 'in', eventIds));
  }, [firestore, eventIds]);

  const { data: events, isLoading: areAssociatedEventsLoading } = useCollection<EventType>(eventsQuery);

  const enrichedTickets = useMemo(() => {
    if (!tickets) return [];
    
    return tickets.map(ticket => {
      const event = events?.find(e => e.id === ticket.eventId);
      let isExpired = false;
      if (event && event.dates && event.dates.length > 0) {
        const lastEventDateItem = event.dates[event.dates.length - 1];
        if (lastEventDateItem?.date) {
            isExpired = isBefore(parseISO(lastEventDateItem.date), startOfToday());
        }
      }
      return { ...ticket, event, isExpired };
    });
  }, [tickets, events]);

  const isLoading = areTicketsLoading;

  const handleShare = (ticketId: string) => {
    const shareUrl = `${window.location.origin}/shared-ticket/${ticketId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
        toast({
            title: 'Link Copied!',
            description: 'The shareable ticket link has been copied to your clipboard.',
        });
    }).catch(err => {
        console.error('Failed to copy link: ', err);
        toast({
            variant: 'destructive',
            title: 'Failed to Copy',
            description: 'Could not copy the link to your clipboard.',
        });
    });
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="flex items-center justify-between">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Crafted Tickets</h1>
                <p className="text-muted-foreground">Manage and view all custom tickets you have crafted and published.</p>
            </div>
            <Button asChild>
                <Link href="/create-ticket">
                    <Palette className="mr-2 h-4 w-4" />
                    Craft New Ticket
                </Link>
            </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Crafted Ticket Packages</CardTitle>
          <CardDescription>A list of all ticket categories you have successfully designed and published.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({length: 6}).map((_, i) => (
                <Skeleton key={i} className="h-80 w-full rounded-lg" />
              ))}
            </div>
          ) : enrichedTickets && enrichedTickets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrichedTickets.map(ticket => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  event={ticket.event}
                  onShare={handleShare}
                  detailsLink={ticket.eventId ? `/vendor/events/${ticket.eventId}/report` : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Ticket className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-muted-foreground">You haven't crafted any tickets yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
