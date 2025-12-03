
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
import { ArrowLeft, CheckCircle, Ticket, XCircle } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { UserTicket } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useParams } from 'next/navigation';

export default function VendorEventReportPage() {
  const firestore = useFirestore();
  const params = useParams();
  const eventId = params.eventId as string;

  const ticketsQuery = useMemoFirebase(() => {
    if (!firestore || !eventId) return null;
    return query(collection(firestore, 'tickets'), where('eventId', '==', eventId));
  }, [firestore, eventId]);

  const { data: tickets, isLoading } = useCollection<UserTicket>(ticketsQuery);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="space-y-2">
         <Button variant="ghost" asChild>
            <Link href="/vendor/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
         </Button>
        <h1 className="text-3xl font-bold tracking-tight">Event Ticket Report</h1>
        <p className="text-muted-foreground">A live report of all tickets for this event and their scan status.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tickets for Event</CardTitle>
          <CardDescription>A list of all tickets crafted for this event.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket ID</TableHead>
                <TableHead>Attendee</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Scanned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({length: 5}).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && tickets && tickets.length > 0 ? (
                tickets.map(ticket => (
                    <TableRow key={ticket.ticketId}>
                        <TableCell className="font-mono text-xs">{ticket.ticketId}</TableCell>
                        <TableCell>{ticket.attendeeName || 'N/A'}</TableCell>
                        <TableCell><Badge variant="outline">{ticket.package} {ticket.tier || ''}</Badge></TableCell>
                        <TableCell>
                            {ticket.scans && ticket.scans > 0 ? (
                                <Badge variant="secondary" className="text-green-600 border-green-600">
                                    <CheckCircle className="mr-1 h-3 w-3"/>
                                    Checked In ({ticket.scans}/{ticket.maxScans})
                                </Badge>
                            ) : (
                                <Badge variant="outline">Not Checked In</Badge>
                            )}
                        </TableCell>
                         <TableCell>
                            {ticket.lastScannedAt ? format(parseISO(ticket.lastScannedAt), 'Pp') : 'N/A'}
                        </TableCell>
                    </TableRow>
                ))
              ) : (
                !isLoading && (
                     <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                           <Ticket className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                           No tickets found for this event yet.
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
