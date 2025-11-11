
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
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon, ArrowLeft, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton"
import Image from "next/image"
import type { Event } from "@/lib/types";
import Link from "next/link";
import { useFirestore, useDoc, updateDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';


const eventFormSchema = z.object({
  name: z.string().min(3, "Event name must be at least 3 characters.").default(""),
  date: z.date({ required_error: "An event date is required." }),
  startTime: z.string().min(1, "Start time is required."),
  endTime: z.string().optional(),
  isOnline: z.boolean().default(false),
  location: z.string().optional().default(""),
  description: z.string().optional().default(""),
  bannerUrl: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be non-negative.").default(0),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

export default function AdminEditEventPage({ params }: { params: { eventId: string } }) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  
  const eventDocRef = useMemoFirebase(() => {
    if (!firestore || !params.eventId) return null;
    return doc(firestore, 'events', params.eventId);
  }, [firestore, params.eventId]);

  const { data: eventData, isLoading } = useDoc<Event>(eventDocRef);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    mode: "onChange",
  });
  
  useEffect(() => {
    if (eventData) {
      form.reset({
        name: eventData.name,
        date: new Date(eventData.date),
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        isOnline: eventData.isOnline,
        location: eventData.location,
        description: eventData.description,
        bannerUrl: eventData.bannerUrl,
        price: eventData.price,
      });
    }
  }, [eventData, form]);

  const onSubmit = (data: EventFormValues) => {
    if (!eventDocRef) return;
    
    updateDocumentNonBlocking(eventDocRef, {
      ...data,
      date: data.date.toISOString(),
    });
    
    toast({
        title: "Event Updated",
        description: `The event "${data.name}" has been successfully updated.`,
    });
    router.push('/admin/events');
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        if (file.size > 4 * 1024 * 1024) { // 4MB limit
            toast({ variant: 'destructive', title: 'File too large', description: 'Image must be smaller than 4MB.' });
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            form.setValue('bannerUrl', result, { shouldValidate: true });
        };
        reader.readAsDataURL(file);
    }
  };

  if (isLoading) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <Skeleton className="h-10 w-1/4" />
          <div className="space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </div>
    );
  }

  if (!eventData && !isLoading) {
      return (
           <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <h1 className="text-3xl font-bold tracking-tight">Event Not Found</h1>
                <p className="text-muted-foreground">The event you are trying to edit does not exist.</p>
                 <Button asChild>
                    <Link href="/admin/events">Back to Events</Link>
                </Button>
            </div>
      )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="space-y-2">
            <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/events"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Events</Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Edit Event: {eventData?.name}</h1>
            <p className="text-muted-foreground">Modify the details of the event below.</p>
        </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-2">
                <div className="w-full aspect-[16/7] bg-card rounded-lg border-2 border-dashed flex items-center justify-center relative overflow-hidden">
                    {form.watch('bannerUrl') ? (
                        <Image src={form.watch('bannerUrl')!} alt="Banner preview" layout="fill" objectFit="cover" />
                    ) : (
                         <div className="text-center text-muted-foreground">
                            <Plus className="mx-auto h-12 w-12" />
                            <p className="mt-2 text-sm font-semibold">Add a cover photo</p>
                        </div>
                    )}
                </div>
                 <Button asChild variant="outline" size="sm">
                    <label htmlFor="banner-upload" className="cursor-pointer">
                        <Plus className="mr-2 h-4 w-4"/> Upload New Banner
                    </label>
                </Button>
                <Input id="banner-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange}/>
            </div>
            
            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Event Name</FormLabel>
                    <FormControl>
                        <Input {...field} placeholder="Event Name" />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Date</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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
                            <FormLabel>Start Time</FormLabel>
                            <FormControl><Input type="time" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>End Time (Optional)</FormLabel>
                            <FormControl><Input type="time" {...field} /></FormControl>
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
                    <FormControl><Input placeholder="Add a venue or address" {...field} disabled={form.watch('isOnline')} /></FormControl>
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
                    <FormControl><Textarea placeholder="Add a description..." {...field} className="min-h-32" /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            
            <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl><Input type="number" placeholder="0.00" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />

            <div className="flex justify-end pt-4 border-t">
                <Button type="submit" size="lg">Save Changes</Button>
            </div>
        </form>
      </Form>
    </div>
  );
}
