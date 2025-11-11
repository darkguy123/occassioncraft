
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
import { CalendarIcon, Image as ImageIcon, MapPin, Plus, Video, Sparkles, Ticket } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase, addDocumentNonBlocking } from "@/firebase";
import type { User as UserType } from "@/lib/types";
import { doc, collection } from "firebase/firestore";
import { useEffect, useState }from "react";
import { Skeleton } from "@/components/ui/skeleton"
import Image from "next/image"
import { EventPreview } from "@/components/event-preview"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { TicketStylePreview } from "@/components/ticket-style-preview"

const eventFormSchema = z.object({
  name: z.string().min(3, "Event name must be at least 3 characters.").default(""),
  date: z.date({ required_error: "An event date is required." }),
  startTime: z.string().min(1, "Start time is required."),
  endTime: z.string().optional(),
  isOnline: z.boolean().default(false),
  location: z.string().optional().default(""),
  description: z.string().optional().default(""),
  bannerUrl: z.string().optional(),
  ticketStyle: z.enum(['simple', 'standard', 'minimal']).default('simple'),
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

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: "",
      date: new Date(),
      startTime: format(new Date(), "HH:mm"),
      isOnline: false,
      location: "",
      description: "",
      bannerUrl: "",
      ticketStyle: 'simple',
      price: 0,
    },
    mode: "onChange",
  });
  
  const isOnline = form.watch('isOnline');
  const watchedEventData = form.watch();

  const onSubmit = (data: EventFormValues) => {
    if (!user || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to create an event.' });
        return;
    }

    const eventCollectionRef = collection(firestore, 'events');
    const eventData = {
        ...data,
        date: data.date.toISOString(),
        vendorId: user.uid,
        organizer: user.displayName, // Denormalizing for easier display
        status: 'approved', // Defaulting to approved for simplicity
    };
    
    addDocumentNonBlocking(eventCollectionRef, eventData);

    toast({
        title: "Event Created",
        description: `Your event "${data.name}" has been successfully created and is now live.`,
    });
    
    const isAdmin = (userData?.roles || []).includes('admin');
    router.push(isAdmin ? '/admin/events' : '/vendor/dashboard');
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

  const isLoading = isUserLoading || isUserDataLoading;
  const isAuthorized = userData && ((userData.roles || []).includes('admin') || (userData.roles || []).includes('vendor'));

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!isAuthorized) {
        toast({
            variant: "destructive",
            title: "Unauthorized",
            description: "You must be a vendor or admin to create an event.",
        });
        router.push('/dashboard');
    }
  }, [isLoading, user, isAuthorized, router, toast]);

  if (isLoading || !isAuthorized) {
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
    <div className="bg-muted/30 min-h-screen">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 max-w-6xl mx-auto py-10 px-4">
          
          {/* Form Fields Column */}
          <div className="space-y-8">
            {/* Banner Section */}
            <div className="space-y-2">
                <div className="w-full aspect-[16/7] bg-card rounded-lg border-2 border-dashed flex items-center justify-center relative overflow-hidden">
                    {form.watch('bannerUrl') ? (
                        <Image src={form.watch('bannerUrl')!} alt="Banner preview" layout="fill" objectFit="cover" />
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
            
            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                <FormItem>
                    <FormControl>
                    <Input {...field} placeholder="Event Name" className="text-3xl font-bold h-auto py-2 border-0 shadow-none px-0 focus-visible:ring-0" />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />

            {/* Date and Time Section */}
            <div className="flex items-start gap-4">
                 <CalendarIcon className="h-6 w-6 text-muted-foreground mt-2"/>
                 <div className="grid gap-4 flex-grow grid-cols-1 sm:grid-cols-2">
                     <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                        <FormItem>
                            <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal h-12", !field.value && "text-muted-foreground")}>
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
                    <div className="flex gap-2">
                        <FormField
                            control={form.control}
                            name="startTime"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                <FormControl><Input type="time" {...field} className="h-12"/></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="endTime"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                <FormControl><Input type="time" {...field} className="h-12"/></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
            </div>

            {/* Location Section */}
            <div className="flex items-start gap-4">
                <div className="h-6 w-6 text-muted-foreground mt-2 flex items-center justify-center">
                    {isOnline ? <Video className="h-6 w-6"/> : <MapPin className="h-6 w-6"/>}
                </div>
                 <div className="grid gap-4 flex-grow">
                    <FormField
                        control={form.control}
                        name="isOnline"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-card">
                            <div className="space-y-0.5">
                                <FormLabel>Online event</FormLabel>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                        )}
                    />
                    {!isOnline && (
                         <FormField
                            control={form.control}
                            name="location"
                            render={({ field }) => (
                            <FormItem>
                                <FormControl><Input placeholder="Add a venue or address" {...field} className="h-12" /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    )}
                 </div>
            </div>
            
            {/* Description Section */}
             <div className="flex items-start gap-4">
                 <Sparkles className="h-6 w-6 text-muted-foreground mt-2"/>
                 <div className="grid gap-4 flex-grow">
                     <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                        <FormItem>
                            <FormControl><Textarea placeholder="Add a description..." {...field} className="min-h-32" /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
            </div>

            {/* Ticket Appearance Section */}
            <div className="flex items-start gap-4">
                <Ticket className="h-6 w-6 text-muted-foreground mt-2" />
                <div className="grid gap-4 flex-grow">
                    <h3 className="font-semibold text-lg">Ticket Appearance</h3>
                    <FormField
                        control={form.control}
                        name="ticketStyle"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="grid grid-cols-3 gap-4"
                                    >
                                        <FormItem>
                                            <FormControl>
                                                <RadioGroupItem value="simple" className="sr-only" />
                                            </FormControl>
                                            <FormLabel className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer">
                                                <div className="w-full h-16 bg-secondary rounded-sm mb-2"></div>
                                                Simple
                                            </FormLabel>
                                        </FormItem>
                                        <FormItem>
                                            <FormControl>
                                                <RadioGroupItem value="standard" className="sr-only" />
                                            </FormControl>
                                             <FormLabel className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer">
                                                <div className="w-full h-16 bg-primary/20 rounded-sm mb-2"></div>
                                                Standard
                                            </FormLabel>
                                        </FormItem>
                                        <FormItem>
                                            <FormControl>
                                                <RadioGroupItem value="minimal" className="sr-only" />
                                            </FormControl>
                                            <FormLabel className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer">
                                                <div className="w-full h-16 bg-accent/20 rounded-sm mb-2"></div>
                                                Minimal
                                            </FormLabel>
                                        </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>
            
            {/* Price Section */}
            <div className="flex items-start gap-4">
                <Ticket className="h-6 w-6 text-muted-foreground mt-2"/>
                <div className="grid gap-4 flex-grow">
                     <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                        <FormItem>
                             <FormLabel>Price</FormLabel>
                            <FormControl><Input type="number" {...field} className="h-12" /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-4 border-t">
                <Button type="submit" size="lg">Publish Event</Button>
            </div>
          </div>

          {/* Preview Column */}
          <div className="hidden md:block sticky top-10 self-start">
             <div className="space-y-8">
                <div>
                  <h3 className="font-semibold mb-4 text-center text-muted-foreground">Event Page Preview</h3>
                  <EventPreview eventData={watchedEventData} bannerUrl={watchedEventData.bannerUrl} />
                </div>
                 <div>
                  <h3 className="font-semibold mb-4 text-center text-muted-foreground">Ticket Preview</h3>
                  <TicketStylePreview eventData={watchedEventData} />
                </div>
             </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
