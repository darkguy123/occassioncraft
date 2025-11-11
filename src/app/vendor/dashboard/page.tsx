
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart2, Ticket, DollarSign, PlusCircle, QrCode, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { User } from "@/lib/types"; // Simplified type
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from 'next/navigation';
import { useEffect } from "react";

export default function VendorDashboardPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const userDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);

    const { data: userData, isLoading: isUserDataLoading } = useDoc<User>(userDocRef);

    const isLoading = isUserLoading || isUserDataLoading;
    const isVendor = (userData?.roles || []).includes('vendor');

    useEffect(() => {
        if (isLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }
        if (!isVendor) {
            // Redirect non-vendors to the vendor landing page to sign up
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

    // A placeholder for a potential pending/rejected status in the future
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
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No active events</p>
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
                <TableCell>Event</TableCell>
                <TableCell>Status</TableCell>
                <TableCell className="text-right">Tickets Sold</TableCell>
                <TableCell className="text-right">Revenue</TableCell>
                <TableCell className="text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  You haven't created any events yet.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
