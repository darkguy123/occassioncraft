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
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
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
import { collection, query, getDocs, collectionGroup, where, doc } from 'firebase/firestore';
import type { Ticket, User, Event } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';

type AggregatedTicket = Ticket & {
  user?: User;
  event?: Event;
};

export default function AdminTicketsPage() {
  const firestore = useFirestore();
  const [tickets, setTickets] = useState<AggregatedTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchTicketsAndDetails = async () => {
      if (!firestore) return;
      setIsLoading(true);

      const ticketsQuery = query(collectionGroup(firestore, 'tickets'));
      const ticketsSnapshot = await getDocs(ticketsQuery);
      const ticketsData = ticketsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));

      const userIds = [...new Set(ticketsData.map(t => t.userId))];
      const eventIds = [...new Set(ticketsData.map(t => t.eventId))];
      
      const users: Record<string, User> = {};
      const events: Record<string, Event> = {};

      // Fetch users in chunks of 10 to avoid query limits if there are many users
      for (let i = 0; i < userIds.length; i += 10) {
        const chunk = userIds.slice(i, i + 10);
        if (chunk.length > 0) {
          const usersQuery = query(collection(firestore, 'users'), where('id', 'in', chunk));
          const usersSnapshot = await getDocs(usersQuery);
          usersSnapshot.docs.forEach(doc => {
            users[doc.id] = { id: doc.id, ...doc.data() } as User;
          });
        }
      }
      
      // Fetch events in chunks of 10
      for (let i = 0; i < eventIds.length; i += 10) {
        const chunk = eventIds.slice(i, i + 10);
        if(chunk.length > 0) {
            const eventsQuery = query(collectionGroup(firestore, 'events'), where('id', 'in', chunk));
            const eventsSnapshot = await getDocs(eventsQuery);
            eventsSnapshot.docs.forEach(doc => {
                events[doc.id] = { id: doc.id, ...doc.data() } as Event;
            });
        }
      }

      const aggregatedData = ticketsData.map(ticket => ({
        ...ticket,
        user: users[ticket.userId],
        event: events[ticket.eventId],
      }));

      setTickets(aggregatedData);
      setIsLoading(false);
    };

    fetchTicketsAndDetails();
  }, [firestore]);
  
  const filteredTickets = tickets.filter(ticket => {
    const search = searchTerm.toLowerCase();
    return (
        ticket.id.toLowerCase().includes(search) ||
        ticket.user?.firstName.toLowerCase().includes(search) ||
        ticket.user?.lastName.toLowerCase().includes(search) ||
        ticket.user?.email.toLowerCase().includes(search) ||
        ticket.event?.name.toLowerCase().includes(search)
    )
  });

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">All Tickets</h1>
          <p className="text-muted-foreground">Manage all tickets purchased on the platform.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tickets</CardTitle>
          <CardDescription>
            A list of all tickets including their status and details.
          </CardDescription>
          <div className="pt-4">
            <Input 
                placeholder="Search by ticket ID, user, or event..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Purchased On</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              )}
              {filteredTickets.map((ticket) => {
                const fullName = `${ticket.user?.firstName || ''} ${ticket.user?.lastName || ''}`.trim();
                const fallback = (ticket.user?.firstName?.[0] || '') + (ticket.user?.lastName?.[0] || '');

                return (
                  <TableRow key={ticket.id}>
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={ticket.user?.profileImageUrl} alt={fullName} />
                                <AvatarFallback>{fallback || 'U'}</AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="font-medium">{fullName || 'N/A'}</div>
                                <div className="text-sm text-muted-foreground">{ticket.user?.email}</div>
                            </div>
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="font-medium">{ticket.event?.name || 'Event not found'}</div>
                        <div className="text-sm text-muted-foreground font-mono">{ticket.id}</div>
                    </TableCell>
                    <TableCell>
                        <Badge variant={ticket.isUsed ? 'secondary' : 'default'} className={!ticket.isUsed ? "bg-green-100 text-green-800" : ""}>
                            {ticket.isUsed ? 'Used' : 'Active'}
                        </Badge>
                    </TableCell>
                     <TableCell>
                        {format(new Date(ticket.purchaseDate), 'PPP')}
                    </TableCell>
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
                           <Link href={`/admin/tickets/${ticket.id}/edit`}>Edit Ticket</Link>
                        </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
           {!isLoading && filteredTickets.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No tickets found.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
