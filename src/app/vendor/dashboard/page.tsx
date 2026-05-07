'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { BarChart2, Ticket, DollarSign, CalendarPlus, QrCode, AlertTriangle, MoreHorizontal, Edit, Trash2, Palette, Calendar, Wallet } from "lucide-react";
import Link from "next/link";
import { useUser, useFirestore, useMemoFirebase, useCollection, deleteDocumentNonBlocking } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import type { Event, Ticket as TicketType, WithdrawalRequest } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge";
import { calculatePlatformFee, calculateVendorNet } from "@/lib/payments";

export default function VendorDashboardPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const vendorEventsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'events'), where('vendorId', '==', user.uid));
    }, [user, firestore]);

    const { data: vendorEvents, isLoading: areEventsLoading } = useCollection<Event>(vendorEventsQuery);

    const ticketsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'tickets'), where('vendorId', '==', user.uid));
    }, [user, firestore]);

    const { data: tickets, isLoading: areTicketsLoading } = useCollection<TicketType>(ticketsQuery);

    const withdrawalsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'withdrawalRequests'), where('vendorId', '==', user.uid));
    }, [user, firestore]);

    const { data: withdrawalRequests, isLoading: areWithdrawalsLoading } = useCollection<WithdrawalRequest>(withdrawalsQuery);

    const salesMetrics = useMemo(() => {
        const soldTickets = (tickets || []).filter(ticket => ticket.userId !== ticket.vendorId && ticket.isPaid);
        const grossSales = soldTickets.reduce((acc, ticket) => acc + (ticket.price || 0), 0);
        const platformFees = soldTickets.reduce((acc, ticket) => acc + (ticket.platformFeeAmount ?? calculatePlatformFee(ticket.price || 0)), 0);
        const walletCredits = soldTickets.reduce((acc, ticket) => acc + (ticket.vendorNetAmount ?? calculateVendorNet(ticket.price || 0)), 0);
        const withdrawalTotal = (withdrawalRequests || [])
          .filter(item => ['pending', 'approved', 'paid'].includes(item.status))
          .reduce((acc, item) => acc + item.amount, 0);

        return {
          grossSales,
          platformFees,
          walletCredits,
          availableBalance: Math.max(walletCredits - withdrawalTotal, 0),
          soldCount: soldTickets.length,
        };
    }, [tickets, withdrawalRequests]);


    const isLoading = areEventsLoading || areTicketsLoading || areWithdrawalsLoading || isUserLoading;
    
    const handleDelete = (eventId: string, eventName: string) => {
        if (!firestore) return;
        const eventRef = doc(firestore, 'events', eventId);
        deleteDocumentNonBlocking(eventRef);
        toast({
          title: "Event Deleted",
          description: `The event "${eventName}" has been successfully deleted.`,
        });
    }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Vendor Dashboard</h1>
            <p className="text-muted-foreground">Manage your events, craft tickets, and track sales.</p>
        </div>
        <div className="flex gap-2">
            <Button asChild>
                <Link href="/create-event">
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Create Event</span>
                </Link>
            </Button>
        </div>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Ticket Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{salesMetrics.grossSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <p className="text-xs text-muted-foreground">All paid attendee ticket purchases</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Wallet Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{salesMetrics.availableBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <p className="text-xs text-muted-foreground">Net sales after 5% platform fee and withdrawal requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{salesMetrics.soldCount}</div>
            <p className="text-xs text-muted-foreground">Purchased by attendees</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Events</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendorEvents?.length || 0}</div>
             <p className="text-xs text-muted-foreground">Total events you've created</p>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Fee Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{salesMetrics.platformFees.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <p className="text-xs text-muted-foreground">5% deduction from your ticket sales</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Events</CardTitle>
          <CardDescription>A list of your active and past events. Create tickets and link them to these events.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile View: Card List */}
          <div className="grid gap-4 md:hidden">
             {isLoading && Array.from({length: 3}).map((_, i) => (
                <Card key={i} className="p-4"><Skeleton className="h-24 w-full" /></Card>
             ))}
             {!isLoading && vendorEvents && vendorEvents.length > 0 ? (
                vendorEvents.map(event => (
                    <Card key={event.id} className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-semibold">{event.name}</h4>
                                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                    <Calendar className="h-4 w-4"/>
                                    {event.dates && event.dates.length > 0 ? new Date(event.dates[0].date).toLocaleDateString() : 'N/A'}
                                </div>
                                <Badge variant="secondary" className="mt-2">{event.status || 'Published'}</Badge>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem asChild><Link href={`/vendor/events/${event.id}/report`}><BarChart2 className="mr-2 h-4 w-4" /> View Report</Link></DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild><Link href={`/vendor/events/${event.id}/edit`}><Edit className="mr-2 h-4 w-4" /> Edit</Link></DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(event.id, event.name)}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </Card>
                ))
             ) : (
                !isLoading && (
                    <div className="py-12 text-center text-muted-foreground">You haven't created any events yet.</div>
                )
             )}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && Array.from({length: 3}).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell colSpan={4}><Skeleton className="h-10" /></TableCell>
                    </TableRow>
                  ))}
                  {!isLoading && vendorEvents && vendorEvents.length > 0 ? (
                    vendorEvents.map(event => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.name}</TableCell>
                        <TableCell><Badge variant="secondary">{event.status || 'Published'}</Badge></TableCell>
                        <TableCell>{event.dates && event.dates.length > 0 ? new Date(event.dates[0].date).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell className="text-right">
                           <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                     <DropdownMenuItem asChild>
                                        <Link href={`/vendor/events/${event.id}/report`}>
                                            <BarChart2 className="mr-2 h-4 w-4" /> View Report
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href={`/vendor/events/${event.id}/edit`}>
                                            <Edit className="mr-2 h-4 w-4" /> Edit
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(event.id, event.name)}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                     !isLoading && (
                        <TableRow>
                            <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                            You haven't created any events yet.
                            </TableCell>
                        </TableRow>
                     )
                  )}
                </TableBody>
              </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
