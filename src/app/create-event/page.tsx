
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
import { CalendarIcon, Image as ImageIcon, MapPin, Plus, Ticket, Users, Layers, Star, Diamond, Shield } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase, addDocumentNonBlocking } from "@/firebase";
import type { User as UserType } from "@/lib/types";
import { doc, collection } from "firebase/firestore";
import { useEffect, useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { usePaystackPayment } from "react-paystack"
import { v4 as uuidv4 } from "uuid"

const eventTiers = {
  regular: { name: 'Regular Event', fee: 70000, maxTickets: 50, description: "₦70,000 for 50 tickets." },
  premium: { name: 'Premium Event', fee: 90000, maxTickets: 50, description: "₦90,000 for 50 tickets with custom guest details." },
  'tier-1': { name: 'Tier 1', fee: 50000, maxTickets: 50, description: "₦50,000 for 50 tickets." },
  'tier-2': { name: 'Tier 2', fee: 60000, maxTickets: 40, description: "₦60,000 for 40 tickets." },
  'tier-3': { name: 'Tier 3', fee: 70000, maxTickets: 20, description: "₦70,000 for 20 tickets." },
  'tier-4': { name: 'Tier 4', fee: 10000, maxTickets: 5, description: "₦10,000 for 5 private tickets with guest names." },
  'tier-5': { name: 'Tier 5', fee: 20000, maxTickets: 1, description: "₦20,000 for 1 private ticket with guest name." }
};

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
  eventType: z.enum(['regular', 'premium', 'tiered']).default('regular'),
  tieredSubType: z.string().optional(),
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
      eventType: 'regular'
    },
    mode: "onChange",
  });

  const eventType = form.watch('eventType');
  const tieredSubType = form.watch('tieredSubType');

  const { fee, maxTickets } = useMemo(() => {
    if (eventType === 'tiered' && tieredSubType) {
      return eventTiers[tieredSubType as keyof typeof eventTiers] || { fee: 0, maxTickets: 0 };
    }
    if (eventType === 'regular' || eventType === 'premium') {
      return eventTiers[eventType];
    }
    return { fee: 0, maxTickets: 0 };
  }, [eventType, tieredSubType]);

  const paystackConfig = {
    reference: uuidv4(),
    email: user?.email || '',
    amount: fee * 100, // Amount in kobo
    currency: 'NGN',
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
  };

  const initializePayment = usePaystackPayment(paystackConfig);
  
  const onPaymentSuccess = (reference: any) => {
    const data = form.getValues();
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
        platformFee: fee,
        maxTickets: maxTickets,
    };
    
    addDocumentNonBlocking(eventCollectionRef, eventData);

    toast({
        title: "Event Created!",
        description: `Your event "${data.name}" has been successfully published.`,
    });
    
    const isAdmin = (userData?.roles || []).includes('admin');
    router.push(isAdmin ? '/admin/events' : '/vendor/dashboard');
  }

  const onPaymentClose = () => {
    toast({
      variant: 'destructive',
      title: 'Payment Closed',
      description: 'The payment process was not completed.',
    });
  };

  const onSubmit = () => {
      if (!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY.startsWith('pk_test_xxxx')) {
        toast({
            variant: 'destructive',
            title: 'Setup Required',
            description: 'The Paystack public key is not configured.',
        });
        return;
      }
    if (fee > 0) {
        initializePayment({onSuccess: onPaymentSuccess, onClose: onPaymentClose});
    } else {
        onPaymentSuccess({ reference: uuidv4() }); // For free events
    }
  }

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        if (file.size > 4 * 1024 * 1024) {
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
        <div className="container max-w-2xl mx-auto py-10 px-4">
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
            <FormField
              control={form.control}
              name="eventType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-xl font-bold">Choose Event Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                    >
                      <Label className={cn("rounded-lg border-2 p-4 cursor-pointer hover:border-primary transition-colors", field.value === 'regular' && 'border-primary bg-primary/5')}>
                        <RadioGroupItem value="regular" className="sr-only" />
                        <Ticket className="mb-2 h-6 w-6" />
                        <p className="font-bold">Regular Event</p>
                        <p className="text-sm text-muted-foreground">{eventTiers.regular.description}</p>
                      </Label>
                      <Label className={cn("rounded-lg border-2 p-4 cursor-pointer hover:border-primary transition-colors", field.value === 'premium' && 'border-primary bg-primary/5')}>
                        <RadioGroupItem value="premium" className="sr-only" />
                        <Star className="mb-2 h-6 w-6" />
                        <p className="font-bold">Premium Event</p>
                        <p className="text-sm text-muted-foreground">{eventTiers.premium.description}</p>
                      </Label>
                      <Label className={cn("rounded-lg border-2 p-4 cursor-pointer hover:border-primary transition-colors", field.value === 'tiered' && 'border-primary bg-primary/5')}>
                         <RadioGroupItem value="tiered" className="sr-only" />
                        <Layers className="mb-2 h-6 w-6" />
                        <p className="font-bold">Tiered Event</p>
                        <p className="text-sm text-muted-foreground">Offer multiple ticket types with different pricing.</p>
                      </Label>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {eventType === 'tiered' && (
              <Card className="p-6">
                <FormField
                    control={form.control}
                    name="tieredSubType"
                    render={({ field }) => (
                    <FormItem className="space-y-3">
                        <FormLabel className="text-lg font-bold">Select Tiered Plan</FormLabel>
                        <FormControl>
                        <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                        >
                            <Label className={cn("rounded-lg border p-4 cursor-pointer hover:border-primary", field.value === 'tier-1' && 'border-primary bg-primary/5')}>
                                <RadioGroupItem value="tier-1" className="sr-only" />
                                <p className="font-semibold">Tier 1</p>
                                <p className="text-sm text-muted-foreground">{eventTiers['tier-1'].description}</p>
                            </Label>
                             <Label className={cn("rounded-lg border p-4 cursor-pointer hover:border-primary", field.value === 'tier-2' && 'border-primary bg-primary/5')}>
                                <RadioGroupItem value="tier-2" className="sr-only" />
                                <p className="font-semibold">Tier 2</p>
                                <p className="text-sm text-muted-foreground">{eventTiers['tier-2'].description}</p>
                            </Label>
                             <Label className={cn("rounded-lg border p-4 cursor-pointer hover:border-primary", field.value === 'tier-3' && 'border-primary bg-primary/5')}>
                                <RadioGroupItem value="tier-3" className="sr-only" />
                                <p className="font-semibold">Tier 3</p>
                                <p className="text-sm text-muted-foreground">{eventTiers['tier-3'].description}</p>
                            </Label>
                             <Label className={cn("rounded-lg border p-4 cursor-pointer hover:border-primary", field.value === 'tier-4' && 'border-primary bg-primary/5')}>
                                <RadioGroupItem value="tier-4" className="sr-only" />
                                <p className="font-semibold">Tier 4</p>
                                <p className="text-sm text-muted-foreground">{eventTiers['tier-4'].description}</p>
                            </Label>
                            <Label className={cn("rounded-lg border p-4 cursor-pointer hover:border-primary", field.value === 'tier-5' && 'border-primary bg-primary/5')}>
                                <RadioGroupItem value="tier-5" className="sr-only" />
                                <p className="font-semibold">Tier 5</p>
                                <p className="text-sm text-muted-foreground">{eventTiers['tier-5'].description}</p>
                            </Label>
                        </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </Card>
            )}

            {/* BANNER */}
            <div className="space-y-2">
                <FormLabel>Event Banner</FormLabel>
                <FormControl>
                  <div className="w-full aspect-[16/7] bg-card rounded-lg border-2 border-dashed flex items-center justify-center relative overflow-hidden">
                      {form.watch('bannerUrl') ? (
                          <Image src={form.watch('bannerUrl')!} alt="Banner" fill className="object-cover" />
                      ) : (
                          <div className="text-center text-muted-foreground">
                              <ImageIcon className="mx-auto h-12 w-12" />
                              <p className="mt-2 text-sm font-semibold">Add a cover photo</p>
                              <p className="text-xs">Recommended size: 1600x900px</p>
                          </div>
                      )}
                  </div>
                </FormControl>
                <Button asChild variant="outline" size="sm">
                    <label htmlFor="banner-upload" className="cursor-pointer w-full">
                        <Plus className="mr-2 h-4 w-4"/> Upload Banner
                    </label>
                </Button>
                <Input id="banner-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange}/>
            </div>

            {/* TITLE */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="My Awesome Event" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* DATE + TIME */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              {/* DATE */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="sm:col-span-1">
                    <FormLabel>Date</FormLabel>

                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <span className="flex w-full items-center justify-between">
                              {field.value ? format(field.value, "PPP") : "Pick a date"}
                              <CalendarIcon className="h-4 w-4 opacity-50" />
                            </span>
                          </Button>
                        </FormControl>
                      </PopoverTrigger>

                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* START TIME */}
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* END TIME */}
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time (Optional)</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ONLINE SWITCH */}
            <FormField
              control={form.control}
              name="isOnline"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-card">
                  <div className="space-y-0.5">
                    <FormLabel>Online event</FormLabel>
                  </div>

                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* LOCATION */}
            {!form.watch('isOnline') && (
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <FormControl>
                        <Input placeholder="Add a venue or address" {...field} className="pl-10" />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* DESCRIPTION */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add a description..." {...field} className="min-h-32" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* PRICE (Ticket Price) */}
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ticket Price (NGN)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormDescription>For Regular/Premium events, this is the price per ticket. For Tiered events, this can be a base price or 0 if tiers define all pricing.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* SUBMIT */}
            <div className="flex justify-end pt-4 border-t">
                <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Publishing...' : `Pay and Publish (₦${fee.toLocaleString()})`}
                </Button>
            </div>
        </form>
      </Form>
    </div>
  );
}

    