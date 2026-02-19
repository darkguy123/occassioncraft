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
import { CheckCircle, Ticket, Share2, Info, Palette } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Ticket as TicketType } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function AllVendorTicketsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const ticketsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'tickets'), where('vendorId', '==', user.uid), orderBy('purchaseDate', 'desc'));
  }, [firestore, user]);

  const { data: tickets, isLoading } = useCollection<TicketType>(ticketsQuery);

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
          <CardTitle>Your Tickets</CardTitle>
          <CardDescription>A list of all tickets you have crafted across all events.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event ID</TableHead>
                <TableHead>Attendee</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({length: 5}).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && tickets && tickets.length > 0 ? (
                tickets.map(ticket => (
                    <TableRow key={ticket.id}>
                        <TableCell className="font-mono text-xs">{ticket.eventId ? ticket.eventId.substring(0, 8) : 'N/A'}...</TableCell>
                        <TableCell>{ticket.attendeeName || 'N/A'}</TableCell>
                        <TableCell><Badge variant="outline">{ticket.package} {ticket.tier || ''}</Badge></TableCell>
                        <TableCell>
                            {ticket.scans > 0 ? (
                                <Badge variant="secondary" className="text-green-600 border-green-600">
                                    <CheckCircle className="mr-1 h-3 w-3"/>
                                    Checked In ({ticket.scans}/{ticket.maxScans})
                                </Badge>
                            ) : (
                                <Badge variant="outline">Not Checked In</Badge>
                            )}
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
                ))
              ) : (
                !isLoading && (
                     <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                           <Ticket className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                           You haven't crafted any tickets yet.
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
