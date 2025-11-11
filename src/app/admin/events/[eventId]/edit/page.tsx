'use client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { notFound, useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon, DollarSign, Save } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { doc, collectionGroup, query, where, getDocs } from "firebase/firestore"
import type { Event } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

const eventFormSchema = z.object({
  name: z.string().min(3, "Event name must be at least 3 characters.").max(100, "Event name must be less than 100 characters."),
  description: z.string().min(10, "Description must be at least 10 characters.").max(2000, "Description must be less than 2000 characters."),
  date: z.date({ required_error: "A date is required." }),
  startTime: z.string().min(1, "Start time is required."),
  location: z.string().min(3, "Location is required."),
  category: z.string({ required_error: "Please select a category." }),
  ticketPrice: z.coerce.number().min(0, "Price must be a positive number."),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

export default function EditEventPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [eventRef, setEventRef] = useState<any>(null);
  const { data: event, isLoading: isEventLoading } = useDoc<Event>(eventRef);

  useEffect(() => {
    const findEvent = async () => {
      if (!firestore) return;
      const eventsQuery = query(
        collectionGroup(firestore, 'events'),
        where('id', '==', eventId)
      );
      const querySnapshot = await getDocs(eventsQuery);
      if (!querySnapshot.empty) {
        const eventDoc = querySnapshot.docs[0];
        setEventRef(eventDoc.ref);
      } else {
        notFound();
      }
    };
    findEvent();
  }, [firestore, eventId]);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
        name: "",
        description: "",
        startTime: "",
        location: "",
        ticketPrice: 0,
        category: 'Other',
        date: undefined,
    }
  });

  useEffect(() => {
    if (event) {
      form.reset({
        name: event.name,
        description: event.description,
        date: new Date(event.date),
        startTime: event.time,
        location: event.location,
        category: event.category,
        ticketPrice: event.price,
      });
    }
  }, [event, form]);

  const onSubmit = (data: EventFormValues) => {
    if (!eventRef) return;
    
    const updatedEventData = {
        ...event,
        name: data.name,
        description: data.description,
        date: data.date.toISOString(),
        time: data.startTime,
        location: data.location,
        category: data.category,
        price: data.ticketPrice,
    };

    updateDocumentNonBlocking(eventRef, updatedEventData);
    
    toast({
        title: "Event Updated",
        description: `"${data.name}" has been successfully updated.`,
    });
    router.push('/admin/events');
  };

  if (isEventLoading || !event) {
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
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-12 w-full" />
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Edit Event</h1>
        <p className="text-muted-foreground">Modify the details for &quot;{event?.name}&quot;.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Event Information</CardTitle>
          <CardDescription>Make changes to the event below and save.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} className="min-h-32" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid md:grid-cols-2 gap-8">
                 <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant={"outline"} className={cn("h-12 w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                  {field.value ? (format(field.value, "PPP")) : (<span>Pick a date</span>)}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} className="h-12"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

               <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-8">
                 <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Music">Music</SelectItem>
                            <SelectItem value="Arts">Arts & Culture</SelectItem>
                            <SelectItem value="Tech">Tech</SelectItem>
                            <SelectItem value="Food">Food & Drink</SelectItem>
                            <SelectItem value="Sports">Sports</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                />
                <FormField
                  control={form.control}
                  name="ticketPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per Ticket (USD)</FormLabel>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Input type="number" placeholder="0.00 for free" className="pl-8 h-12" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
