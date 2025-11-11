'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { format } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminApprovalsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const pendingEventsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'events'), where('status', '==', 'pending'));
  }, [firestore]);

  const { data: pendingEvents, isLoading } = useCollection<Event>(pendingEventsQuery);

  const handleUpdateStatus = async (eventId: string, vendorId: string, eventName: string, status: 'approved' | 'rejected') => {
    if (!firestore) return;

    // We need to find the document reference to update it.
    const eventQuery = query(
      collectionGroup(firestore, 'events'),
      where('id', '==', eventId),
      where('vendorId', '==', vendorId)
    );

    const querySnapshot = await getDocs(eventQuery);
    if (querySnapshot.empty) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not find the event to update.' });
      return;
    }

    const eventDocRef = querySnapshot.docs[0].ref;
    updateDocumentNonBlocking(eventDocRef, { status });

    toast({
      title: `Event ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      description: `"${eventName}" has been ${status}.`,
    });
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Pending Approvals</h1>
        <p className="text-muted-foreground">Review and approve events submitted by vendors.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Awaiting Review</CardTitle>
          <CardDescription>
            These events need to be approved before they are visible to the public.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Organizer</TableHead>
                <TableHead>Submitted On</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              )}
              {pendingEvents && pendingEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div className="font-medium">{event.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(event.date), 'PPP')}
                    </div>
                  </TableCell>
                  <TableCell>{event.organizer}</TableCell>
                  <TableCell>
                    {/* Assuming createdAt exists, otherwise show event date */}
                    {event.date ? format(new Date(event.date), 'PPP') : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                     <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => handleUpdateStatus(event.id, event.vendorId!, event.name, 'rejected')}
                    >
                        <XCircle className="mr-2 h-4 w-4"/> Reject
                    </Button>
                     <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleUpdateStatus(event.id, event.vendorId!, event.name, 'approved')}
                    >
                        <CheckCircle className="mr-2 h-4 w-4"/> Approve
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!isLoading && pendingEvents?.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              No events are currently pending approval.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    