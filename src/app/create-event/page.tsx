
'use client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon, Image as ImageIcon, MapPin, Plus, Video, Ticket } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase, addDocumentNonBlocking } from "@/firebase";
import type { User as UserType } from "@/lib/types";
import { doc, collection } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton"
import Image from "next/image"

const eventFormSchema = z.object({
  name: z.string().min(3, "Event name must be at least 3 characters.").default(""),
  date: z.date({ required_error: "An event date is required." }),
  startTime: z.string().min(1, "Start time is required."),
  endTime: z.string().optional().default(""),
  isOnline: z.boolean().default(false),
  location: z.string().optional().default(""),
  description: z.string().optional().default(""),
  bannerUrl: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be non-negative.").default(0),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;


export default function CreateEventPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserType>(userDocRef);
  
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: "",
      date: new Date(),
      startTime: format(new Date(), "HH:mm"),
      isOnline: false,
      location: "",
      description: "",
      price: 0,
    },
    mode: "onChange",
  });

  const isOnline = form.watch('isOnline');

  useEffect(() => {
    const isLoading = isUserLoading || isUserDataLoading;
    if (isLoading) {
      setAuthStatus('loading');
      return;
    }

    if (!user) {
      router.push('/login');
      setAuthStatus('unauthorized');
      return;
    }
    
    const isAuthorized = (userData?.roles || []).includes('admin') || (userData?.roles || []).includes('vendor');

    if (isAuthorized) {
        setAuthStatus('authorized');
    } else {
        setAuthStatus('unauthorized');
        toast({
            variant: "destructive",
            title: "Unauthorized",
            description: "You must be a vendor or admin to create an event.",
        });
        router.push('/dashboard');
    }
  }, [isUserLoading, isUserDataLoading, user, userData, router, toast]);

  const onSubmit = (data: EventFormValues) => {
    if (!user || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Authentication or database error.' });
        return;
    }
    const eventCollectionRef = collection(firestore, 'events');

    const eventData = {
        ...data,
        date: data.date.toISOString(),
        vendorId: user.uid,
        organizer: user.displayName, 
        status: 'approved',
        // Setting default values for the new required fields
        eventType: 'regular',
        platformFee: 0,
        maxTickets: 100,
    };
    
    addDocumentNonBlocking(eventCollectionRef, eventData);

    toast({
        title: "Event Created",
        description: `Your event "${data.name}" has been successfully created and is now live.`,
    });
    
    const isAdmin = (userData?.roles || []).includes('admin');
    router.push(isAdmin ? '/admin/events' : '/vendor/dashboard');
  }
  
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
  

  if (authStatus !== 'authorized') {
    return (
        <div className="max-w-2xl mx-auto py-10 px-4">
          <Skeleton className="h-10 w-3/4 mb-8" />
          <div className="space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-10 px-4">
        <div className="space-y-2 mb-8">
            <h1 className="text-4xl font-bold font-headline">Create a New Event</h1>
            <p className="text-muted-foreground">Fill out the details below to get your event published.</p>
        </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <div className="space-y-2">
                <FormLabel>Event Banner</FormLabel>
                <div className="w-full aspect-[16/7] bg-card rounded-lg border-2 border-dashed flex items-center justify-center relative overflow-hidden">
                    {form.watch('bannerUrl') ? (
                        <Image src={form.watch('bannerUrl')!} alt="Banner preview" fill objectFit="cover" />
                    ) : (
                        <div className="text-center text-muted-foreground">
                            <ImageIcon className="mx-auto h-12 w-12" />
                            <p className="mt-2 text-sm font-semibold">Add a cover photo</p>
                            <p className="text-xs">Recommended size: 1600x900px</p>
                        </div>
                    )}
                </div>
                <Button asChild variant="outline" size="sm">
                    <label htmlFor="banner-upload" className="cursor-pointer w-full">
                        <Plus className="mr-2 h-4 w-4"/> Upload Banner
                    </label>
                </Button>
                <Input id="banner-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange}/>
            </div>
            
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Event Title</FormLabel> <FormControl> <Input {...field} placeholder="My Awesome Event" /> </FormControl> <FormMessage /> </FormItem> )}/>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField control={form.control} name="date" render={({ field }) => ( <FormItem className="sm:col-span-1"> <FormLabel>Date</FormLabel> <Popover> <PopoverTrigger asChild> <FormControl> <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}> {field.value ? format(field.value, "PPP") : <span>Pick a date</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" /> </Button> </FormControl> </PopoverTrigger> <PopoverContent className="w-auto p-0" align="start"> <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /> </PopoverContent> </Popover> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="startTime" render={({ field }) => ( <FormItem> <FormLabel>Start Time</FormLabel> <FormControl><Input type="time" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="endTime" render={({ field }) => ( <FormItem> <FormLabel>End Time (Optional)</FormLabel> <FormControl><Input type="time" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            </div>
            
            <FormField control={form.control} name="isOnline" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-card"> <div className="space-y-0.5"> <FormLabel>Online event</FormLabel> </div> <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl> </FormItem> )}/>
            {!isOnline && (
                <FormField control={form.control} name="location" render={({ field }) => ( <FormItem> <FormLabel>Location</FormLabel> <FormControl> <div className="relative"> <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /> <Input placeholder="Add a venue or address" {...field} className="pl-10" /> </div> </FormControl> <FormMessage /> </FormItem> )}/>
            )}
            
            <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Textarea placeholder="Add a description..." {...field} className="min-h-32" /></FormControl> <FormMessage /> </FormItem> )}/>
            
            <FormField control={form.control} name="price" render={({ field }) => ( <FormItem> <FormLabel>Ticket Price (NGN)</FormLabel> <FormControl><Input type="number" placeholder="0.00" {...field} /></FormControl> <FormDescription>Set to 0 for a free event.</FormDescription> <FormMessage /> </FormItem> )}/>

            <div className="flex justify-end pt-4 border-t">
                <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Publishing...' : 'Publish Event'}
                </Button>
            </div>
        </form>
      </Form>
    </div>
  );
}
