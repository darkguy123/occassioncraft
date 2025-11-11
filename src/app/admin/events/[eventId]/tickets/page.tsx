
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function ManageTicketsPage({ params }: { params: { eventId: string } }) {
  
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="space-y-2">
         <Button variant="ghost" asChild>
            <Link href="/admin/events">&larr; Back to Events</Link>
         </Button>
        <h1 className="text-3xl font-bold tracking-tight">Manage Tickets</h1>
        <p className="text-muted-foreground">This page is a placeholder. The database has been reset.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Approval</CardTitle>
          <CardDescription>This functionality is disabled because the project backend was reset.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">No tickets are pending approval.</p>
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
                <TableCell>Ticket ID</TableCell>
                <TableCell>Event</TableCell>
                <TableCell>Purchase Date</TableCell>
                <TableCell className="text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                   No approved tickets for this event yet.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
