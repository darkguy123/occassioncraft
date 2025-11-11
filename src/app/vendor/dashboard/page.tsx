
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { vendorEvents } from "@/lib/placeholder-data";
import { BarChart2, Ticket, DollarSign, PlusCircle, QrCode, MoreHorizontal, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Vendor, User as UserType } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from 'next/navigation';
import { useEffect } from "react";

export default function VendorDashboardPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const vendorRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'vendors', user.uid);
    }, [firestore, user]);

    const userDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);

    const { data: vendorData, isLoading: isVendorLoading } = useDoc<Vendor>(vendorRef);
    const { data: userData, isLoading: isUserDataLoading } = useDoc<UserType>(userDocRef);

    const totalRevenue = vendorEvents.reduce((acc, event) => acc + event.revenue, 0);
    const totalTicketsSold = vendorEvents.reduce((acc, event) => acc + event.ticketsSold, 0);

    const isLoading = isUserLoading || isVendorLoading || isUserDataLoading;
    const isVendor = (userData?.roles || []).includes('vendor');
    const isAuthorized = isVendor && vendorData?.status === 'approved';


    useEffect(() => {
        if (isLoading) {
            return; // Wait for all data to load
        }
        
        if (!user) {
            router.push('/login');
            return;
        }

        if (!isVendor) {
            router.push('/vendor');
        }

    }, [isLoading, user, isVendor, router]);

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
    
    if (isVendor && vendorData?.status === 'pending') {
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
                         <p>You will be notified once your application has been approved. You can then start creating events and selling tickets. Thank you for your patience.</p>
                     </CardContent>
                 </Card>
            </div>
         );
    }

    // This check handles the case where the redirect hasn't happened yet
    if (!isAuthorized) {
        return (
            <div className="container mx-auto py-12 px-4 text-center">
                <p>Verifying permissions...</p>
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
            <Button variant="outline">
                <QrCode className="mr-2 h-4 w-4" />
                Scan Ticket
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
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{totalTicketsSold.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+180.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Events</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendorEvents.length}</div>
            <p className="text-xs text-muted-foreground">+2 since last month</p>
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
                <TableHead className="text-right">Tickets Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendorEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div className="font-medium">{event.name}</div>
                    <div className="text-sm text-muted-foreground">{new Date(event.date).toLocaleDateString()}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={new Date(event.date) > new Date() ? "default" : "secondary"} className={new Date(event.date) > new Date() ? "bg-green-100 text-green-800" : ""}>
                      {new Date(event.date) > new Date() ? "Upcoming" : "Completed"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{event.ticketsSold.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${event.revenue.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View</DropdownMenuItem>
                          <DropdownMenuItem>Manage</DropdownMenuItem>
                          <DropdownMenuItem>Duplicate</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
