
'use client';

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableHead,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { CheckCircle, Ticket, Share2, Info, Palette, Clock } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Ticket as TicketType, Event as EventType } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isBefore, startOfToday } from 'date-fns';

export default function AllVendorTicketsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const ticketsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'tickets'),
      where('vendorId', '==', user.uid),
      where('isPaid', '==', true),
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
    if (areAssociatedEventsLoading && eventIds.length > 0) {
      // If events are still loading, just return tickets for now to avoid flicker
      return tickets.map(t => ({...t, event: undefined, isExpired: false}));
    }

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
  }, [tickets, events, areAssociatedEventsLoading, eventIds]);


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
                <h1 className="text-3xl font-bold tracking-tight">All Crafted Tickets</h1>
                <p className="text-muted-foreground">Manage, share, and track all tickets you've created.</p>
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
          <CardTitle>Your Purchased Tickets</CardTitle>
          <CardDescription>A list of all tickets you have successfully crafted and paid for across all events.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Attendee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Scanned</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({length: 5}).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && enrichedTickets && enrichedTickets.length > 0 ? (
                enrichedTickets.map(ticket => {
                    const eventName = ticket.event ? ticket.event.name : (ticket.eventId ? `Event ID: ${ticket.eventId.substring(0, 8)}...` : 'Standalone');

                    let statusBadge;
                    if (ticket.isExpired) {
                        statusBadge = <Badge variant="destructive" className="items-center"><Clock className="mr-1 h-3 w-3" /> Expired</Badge>;
                    } else if (ticket.scans > 0) {
                        statusBadge = <Badge variant="secondary" className="text-green-600 border-green-600">
                                    <CheckCircle className="mr-1 h-3 w-3"/>
                                    Checked In ({ticket.scans}/{ticket.maxScans})
                                </Badge>;
                    } else {
                        statusBadge = <Badge variant="outline">Not Checked In</Badge>;
                    }
                    
                    return (
                        <TableRow key={ticket.id}>
                            <TableCell className="font-medium">{eventName}</TableCell>
                            <TableCell>{ticket.attendeeName || 'N/A'}</TableCell>
                            <TableCell>{statusBadge}</TableCell>
                            <TableCell>
                                {ticket.lastScannedAt ? format(parseISO(ticket.lastScannedAt), 'Pp') : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                               <Button variant="outline" size="sm" onClick={() => handleShare(ticket.id)}>
                                    <Share2 className="mr-2 h-4 w-4" /> Share
                                </Button>
                               {ticket.eventId && (
                                <Button asChild size="sm">
                                    <Link href={`/vendor/events/${ticket.eventId}/tickets/${ticket.id}`}>
                                        <Info className="mr-2 h-4 w-4" /> Details
                                    </Link>
                                </Button>
                               )}
                            </TableCell>
                        </TableRow>
                    )
                })
              ) : (
                !isLoading && (
                     <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                           <Ticket className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                           You haven't purchased any tickets yet.
                        </TableCell>
                    </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
