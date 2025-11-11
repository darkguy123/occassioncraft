'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useRouter, notFound } from 'next/navigation';
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { doc, getDocs, collectionGroup, query, where } from "firebase/firestore";
import type { Ticket, User, Event } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import { format } from "date-fns";

const ticketFormSchema = z.object({
  isUsed: z.boolean(),
});

type TicketFormValues = z.infer<typeof ticketFormSchema>;

export default function EditTicketPage({ params }: { params: { ticketId: string } }) {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [ticketRef, setTicketRef] = useState<any>(null);

  const { data: ticket, isLoading: isTicketLoading, error } = useDoc<Ticket>(ticketRef);
  
  const userRef = useMemoFirebase(() => {
    if (!firestore || !ticket?.userId) return null;
    return doc(firestore, 'users', ticket.userId);
  },[firestore, ticket]);
  
  const { data: user, isLoading: isUserLoading } = useDoc<User>(userRef);

  useEffect(() => {
    const findTicket = async () => {
        if(!firestore) return;
        const ticketsQuery = query(collectionGroup(firestore, 'tickets'), where('id', '==', params.ticketId));
        const querySnapshot = await getDocs(ticketsQuery);
        if(!querySnapshot.empty) {
            const ticketDoc = querySnapshot.docs[0];
            setTicketRef(ticketDoc.ref);
        } else {
            notFound();
        }
    }
    findTicket();
  }, [firestore, params.ticketId]);

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      isUsed: false,
    }
  });

  useEffect(() => {
    if (ticket) {
      form.reset({
        isUsed: ticket.isUsed,
      });
    }
  }, [ticket, form]);

  if (error) {
    notFound();
  }

  const onSubmit = (data: TicketFormValues) => {
    if (!ticketRef) return;
    
    updateDocumentNonBlocking(ticketRef, data);
    
    toast({
      title: "Ticket Updated",
      description: `Ticket ${ticket?.id} has been successfully updated.`,
    });
    router.push('/admin/tickets');
  };

  const isLoading = isTicketLoading || isUserLoading;

  if (isLoading || !ticket) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-6 w-1/2" />
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="space-y-2">
        <Button variant="ghost" asChild>
          <Link href="/admin/tickets">&larr; Back to All Tickets</Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Ticket</h1>
        <p className="text-muted-foreground font-mono">{ticket.id}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Ticket Information</CardTitle>
          <CardDescription>Make changes to the ticket below and save.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
               <div className="space-y-4 rounded-md border p-4">
                  <h3 className="font-semibold">User Details</h3>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Name: </span>
                    <span>{user?.firstName} {user?.lastName}</span>
                  </p>
                   <p className="text-sm">
                    <span className="text-muted-foreground">Email: </span>
                    <span>{user?.email}</span>
                  </p>
                   <p className="text-sm">
                    <span className="text-muted-foreground">Purchased On: </span>
                    <span>{format(new Date(ticket.purchaseDate), 'PPP')}</span>
                  </p>
               </div>
              <FormField
                control={form.control}
                name="isUsed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Ticket Status
                      </FormLabel>
                      <FormDescription>
                        Mark this ticket as used. This action cannot be undone once the ticket has been scanned at an event.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end">
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
