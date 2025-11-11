'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { sampleEvents, userTickets } from '@/lib/placeholder-data';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function ManageTicketsPage({ params }: { params: { eventId: string } }) {
  const event = sampleEvents.find(e => e.id === params.eventId);
  const ticketsForEvent = userTickets.filter(t => t.event.id === params.eventId);

  // In a real app, you would have vendor-submitted tickets as well
  const pendingTickets = [
      { id: 'tkt-pending-1', userName: 'Vendor User 1', purchaseDate: '2024-09-20', status: 'pending' },
      { id: 'tkt-pending-2', userName: 'Vendor User 2', purchaseDate: '2024-09-21', status: 'pending' },
  ];

  if (!event) {
    return notFound();
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="space-y-2">
         <Button variant="ghost" asChild>
            <Link href="/admin/events">&larr; Back to Events</Link>
         </Button>
        <h1 className="text-3xl font-bold tracking-tight">Manage Tickets</h1>
        <p className="text-muted-foreground">Approve, deny, and view tickets for &quot;{event.name}&quot;.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Approval</CardTitle>
          <CardDescription>These tickets were submitted by vendors and require your approval.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                 <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Submission Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pendingTickets.map(ticket => (
                         <TableRow key={ticket.id}>
                            <TableCell>{ticket.userName}</TableCell>
                            <TableCell>{new Date(ticket.purchaseDate).toLocaleDateString()}</TableCell>
                            <TableCell><Badge variant="secondary">Pending</Badge></TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700">
                                    <Check className="mr-2 h-4 w-4"/> Approve
                                </Button>
                                 <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700">
                                    <X className="mr-2 h-4 w-4"/> Deny
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
             {pendingTickets.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No tickets are pending approval.</p>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Approved Tickets</CardTitle>
          <CardDescription>A list of all confirmed tickets for this event.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket ID</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ticketsForEvent.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-mono">{ticket.id}</TableCell>
                  <TableCell>{ticket.event.name}</TableCell>
                  <TableCell>{new Date(ticket.purchaseDate).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4"/>
                        <span className="sr-only">Delete Ticket</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           {ticketsForEvent.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No approved tickets for this event yet.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
