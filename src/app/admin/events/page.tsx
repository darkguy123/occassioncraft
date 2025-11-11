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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { format } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collectionGroup, query } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminEventsPage() {
  const firestore = useFirestore();
  const eventsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'events'));
  }, [firestore]);

  const { data: events, isLoading } = useCollection<Event>(eventsQuery);

  const getBadgeVariant = (status?: 'approved' | 'pending' | 'rejected') => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Events</h1>
            <p className="text-muted-foreground">Manage all events on the platform.</p>
        </div>
        <Button asChild>
          <Link href="/create-event">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Event
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
          <CardDescription>
            A list of all events including their status and details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Organizer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              )}
              {events && events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div className="font-medium">{event.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(event.date), 'PPP')}
                    </div>
                  </TableCell>
                  <TableCell>{event.organizer}</TableCell>
                  <TableCell>
                     <Badge variant={getBadgeVariant(event.status)}>
                        {event.status ? event.status.charAt(0).toUpperCase() + event.status.slice(1) : 'N/A'}
                      </Badge>
                  </TableCell>
                  <TableCell>${event.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                           <Link href={`/events/${event.id}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                           <Link href={`/admin/events/${event.id}/edit`}>Edit Event</Link>
                        </DropdownMenuItem>
                         <DropdownMenuItem asChild>
                           <Link href={`/admin/events/${event.id}/tickets`}>Manage Tickets</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Unpublish</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           {!isLoading && events?.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No events found.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

    