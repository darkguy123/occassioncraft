
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { BarChart2, Ticket, DollarSign, PlusCircle, QrCode, AlertTriangle, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection, deleteDocumentNonBlocking } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import type { User, Event } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from 'next/navigation';
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge";

export default function VendorDashboardPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const userDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);

    const { data: userData, isLoading: isUserDataLoading } = useDoc<User>(userDocRef);

    const vendorEventsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'events'), where('vendorId', '==', user.uid));
    }, [user, firestore]);

    const { data: vendorEvents, isLoading: areEventsLoading } = useCollection<Event>(vendorEventsQuery);

    const isLoading = isUserLoading || isUserDataLoading || areEventsLoading;
    const isVendor = (userData?.roles || []).includes('vendor');

    useEffect(() => {
        if (isUserLoading || isUserDataLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }
        if (!isVendor) {
            router.push('/vendor');
        }
    }, [isUserLoading, isUserDataLoading, user, isVendor, router]);
    
    const handleDelete = (eventId: string, eventName: string) => {
        if (!firestore) return;
        const eventRef = doc(firestore, 'events', eventId);
        deleteDocumentNonBlocking(eventRef);
        toast({
          title: "Event Deleted",
          description: `The event "${eventName}" has been successfully deleted.`,
        });
    }

    if (isLoading) {
        return (
             <div className="container mx-auto py-12 px-4 space-y-8">
                <Skeleton className="h-12 w-1/2" />
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
                <Skeleton className="h-96" />
            </div>
        )
    }
    
    // This check is a placeholder for a more robust vendor status check (e.g. from a 'vendors' collection)
    const vendorStatus = 'approved'; 

    if (vendorStatus === 'pending') {
         return (
             <div className="container mx-auto py-12 px-4 text-center">
                 <Card className="max-w-lg mx-auto">
                     <CardHeader>
                        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
                         <CardTitle className="text-2xl">Application Pending</CardTitle>
                         <CardDescription>
                            Your vendor application is currently under review.
                         </CardDescription>
                     </CardHeader>
                     <CardContent>
                         <p>You will be notified once your application has been approved. Thank you for your patience.</p>
                     </CardContent>
                 </Card>
            </div>
         );
    }
    
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
            <h1 className="text-4xl font-bold font-headline">Vendor Dashboard</h1>
            <p className="text-muted-foreground">Manage your events, track sales, and engage with your attendees.</p>
        </div>
        <div className="flex gap-2">
            <Button asChild variant="outline">
                <Link href="/validate">
                    <QrCode className="mr-2 h-4 w-4" />
                    Scan Ticket
                </Link>
            </Button>
            <Button asChild>
                <Link href="/create-event">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Event
                </Link>
            </Button>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">No sales data yet</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+0</div>
            <p className="text-xs text-muted-foreground">No tickets sold yet</p>
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Events</CardTitle>
          <CardDescription>A list of your active and past events.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areEventsLoading && (
                <TableRow>
                    <TableCell colSpan={5}><Skeleton className="h-20" /></TableCell>
                </TableRow>
              )}
              {!areEventsLoading && vendorEvents && vendorEvents.length > 0 ? (
                vendorEvents.map(event => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.name}</TableCell>
                    <TableCell><Badge variant="secondary">{event.status || 'Published'}</Badge></TableCell>
                    <TableCell>${event.price.toFixed(2)}</TableCell>
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
                                    <Link href={`/admin/events/${event.id}/edit`}>
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
                 !areEventsLoading && (
                    <TableRow>
                        <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                        You haven't created any events yet.
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
