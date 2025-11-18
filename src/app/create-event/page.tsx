
'use client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon, Image as ImageIcon, MapPin, Plus, Video, Sparkles, Ticket, Upload, RefreshCw, Trash2, PartyPopper, Users, Star } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase, addDocumentNonBlocking } from "@/firebase";
import type { User as UserType } from "@/lib/types";
import { doc, collection } from "firebase/firestore";
import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton"
import Image from "next/image"
import { EventPreview } from "@/components/event-preview"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import backgroundsData from '@/lib/ticket-backgrounds.json';
import { TicketStylePreview } from "@/components/ticket-style-preview";

const tierSchema = z.object({
  name: z.string().min(1, "Tier name is required."),
  price: z.coerce.number().min(0, "Price must be non-negative."),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
});

const eventFormSchema = z.object({
  eventType: z.enum(['regular', 'premium', 'tiered'], { required_error: "You must select an event type." }),
  name: z.string().min(3, "Event name must be at least 3 characters.").default(""),
  date: z.date({ required_error: "An event date is required." }),
  startTime: z.string().min(1, "Start time is required."),
  endTime: z.string().optional().default(""),
  isOnline: z.boolean().default(false),
  location: z.string().optional().default(""),
  description: z.string().optional().default(""),
  bannerUrl: z.string().optional(),
  ticketImageUrl: z.string().optional(),
  ticketBrandingImageUrl: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be non-negative.").default(0),
  premiumOption: z.enum(['individual', 'general']).optional(),
  tiers: z.array(tierSchema).optional(),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

const allBackgrounds = backgroundsData.backgrounds;

export default function CreateEventPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [displayedBackgrounds, setDisplayedBackgrounds] = useState<{id: string; url: string}[]>([]);

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
      endTime: "",
      isOnline: false,
      location: "",
      description: "",
      bannerUrl: "",
      ticketImageUrl: "",
      ticketBrandingImageUrl: "",
      price: 0,
      tiers: [{ name: 'General Admission', price: 0, quantity: 100 }],
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "tiers",
  });
  
  const loadNewBackgrounds = useCallback(() => {
    const shuffled = [...allBackgrounds].sort(() => 0.5 - Math.random());
    const newSelection = shuffled.slice(0, 5);
    setDisplayedBackgrounds(newSelection);
    if (newSelection.length > 0 && !form.getValues('ticketImageUrl')) {
        form.setValue('ticketImageUrl', newSelection[0].url);
    }
  }, [form]);

  useEffect(() => {
    loadNewBackgrounds();
  }, [loadNewBackgrounds]);


  const isOnline = form.watch('isOnline');
  const watchedEventData = form.watch();
  const eventType = form.watch('eventType');

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
    
    const isAdminByRole = (userData?.roles || []).includes('admin');
    const isVendor = (userData?.roles || []).includes('vendor');
    const isAuthorized = isAdminByRole || isVendor;

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
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to create an event.' });
        return;
    }

    const eventCollectionRef = collection(firestore, 'events');
    const eventData = {
        ...data,
        date: data.date.toISOString(),
        vendorId: user.uid,
        organizer: user.displayName, 
        status: 'approved', 
    };
    
    addDocumentNonBlocking(eventCollectionRef, eventData);

    toast({
        title: "Event Created",
        description: `Your event "${data.name}" has been successfully created and is now live.`,
    });
    
    const isAdmin = (userData?.roles || []).includes('admin');
    router.push(isAdmin ? '/admin/events' : '/vendor/dashboard');
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, field: 'bannerUrl' | 'ticketBrandingImageUrl') => {
    const file = event.target.files?.[0];
    if (file) {
        if (file.size > 4 * 1024 * 1024) { // 4MB limit
            toast({ variant: 'destructive', title: 'File too large', description: 'Image must be smaller than 4MB.' });
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            form.setValue(field, result, { shouldValidate: true });
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
    <div className="bg-muted/30 min-h-screen">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 max-w-6xl mx-auto py-10 px-4">
          
          <div className="space-y-8">
            <FormField
                control={form.control}
                name="eventType"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                        <FormLabel className="text-xl font-bold">Choose Event Type</FormLabel>
                        <FormControl>
                            <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                            >
                                <FormItem>
                                    <FormControl>
                                        <RadioGroupItem value="regular" className="sr-only" />
                                    </FormControl>
                                    <FormLabel className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer h-full">
                                        <PartyPopper className="mb-3 h-8 w-8" />
                                        <span className="font-bold">Regular</span>
                                        <span className="text-xs text-muted-foreground text-center mt-1">Simple, effective events with standard options.</span>
                                    </FormLabel>
                                </FormItem>
                                <FormItem>
                                    <FormControl>
                                        <RadioGroupItem value="premium" className="sr-only" />
                                    </FormControl>
                                    <FormLabel className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer h-full">
                                        <Star className="mb-3 h-8 w-8" />
                                        <span className="font-bold">Premium</span>
                                        <span className="text-xs text-muted-foreground text-center mt-1">Custom tickets and more flexibility.</span>
                                    </FormLabel>
                                </FormItem>
                                <FormItem>
                                    <FormControl>
                                        <RadioGroupItem value="tiered" className="sr-only" />
                                    </FormControl>
                                    <FormLabel className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer h-full">
                                        <Users className="mb-3 h-8 w-8" />
                                        <span className="font-bold">Tiered</span>
                                        <span className="text-xs text-muted-foreground text-center mt-1">Offer multiple ticket types like VIP, GA, etc.</span>
                                    </FormLabel>
                                </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {eventType && (
                <>
                <div className="space-y-2">
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
                    <Input id="banner-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'bannerUrl')}/>
                </div>
                
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Event Title</FormLabel>
                        <FormControl>
                        <Input {...field} placeholder="My Awesome Event" className="text-xl font-bold h-auto py-2" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />

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
                                    <FormControl>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                            <Input placeholder="Add a venue or address" {...field} className="h-12 pl-10" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        )}
                     </div>
                </div>
                
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
                
                <div className="flex items-start gap-4">
                    <Ticket className="h-6 w-6 text-muted-foreground mt-2" />
                    <div className="grid gap-4 flex-grow">
                        <h3 className="font-semibold text-lg">Ticket Appearance</h3>
                        
                        {(eventType === 'premium' || eventType === 'tiered') && (
                            <div className="grid gap-2">
                                <FormLabel>Branding Image (Optional)</FormLabel>
                                <div className="flex items-center gap-4">
                                {form.watch('ticketBrandingImageUrl') && <Image src={form.watch('ticketBrandingImageUrl')!} alt="Branding preview" width={100} height={50} className="rounded-md object-contain h-14 bg-slate-200" />}
                                    <Button asChild variant="outline" size="sm">
                                        <label htmlFor="branding-upload" className="cursor-pointer">
                                            <Upload className="mr-2 h-4 w-4"/> Upload Logo/Banner
                                        </label>
                                    </Button>
                                </div>
                                <Input id="branding-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'ticketBrandingImageUrl')}/>
                                <p className="text-xs text-muted-foreground">Recommended aspect ratio: 2:1 (e.g. 400x200px)</p>
                            </div>
                        )}

                        <FormField
                            control={form.control}
                            name="ticketImageUrl"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <FormLabel>Ticket Background</FormLabel>
                                  <Button type="button" variant="ghost" size="sm" onClick={loadNewBackgrounds}>
                                    <RefreshCw className="mr-2 h-4 w-4"/> Load More
                                  </Button>
                                </div>
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        className="grid grid-cols-3 gap-4"
                                    >
                                        {displayedBackgrounds.map((bg) => (
                                            <FormItem key={bg.id}>
                                                <FormControl>
                                                    <RadioGroupItem value={bg.url} className="sr-only" />
                                                </FormControl>
                                                <FormLabel className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer h-28">
                                                    <Image src={bg.url} alt={`background ${bg.id}`} width={120} height={100} className="w-full h-full object-cover rounded-sm" />
                                                </FormLabel>
                                            </FormItem>
                                        ))}
                                    </RadioGroup>
                                </FormControl>
                                {eventType === 'regular' && <FormDescription className="text-xs">Regular events are limited to these 5 background options.</FormDescription>}
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
                
                <div className="flex items-start gap-4">
                    <Ticket className="h-6 w-6 text-muted-foreground mt-2"/>
                    <div className="grid gap-4 flex-grow">
                        {eventType === 'regular' && (
                            <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Price</FormLabel>
                                    <FormControl><Input type="number" {...field} className="h-12" /></FormControl>
                                    <FormDescription>Set to 70000 for 50 tickets as per Regular plan.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        )}
                        {eventType === 'premium' && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="premiumOption"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                        <FormLabel>Premium Options</FormLabel>
                                        <FormControl>
                                            <RadioGroup
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            className="flex flex-col space-y-1"
                                            >
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl><RadioGroupItem value="individual" /></FormControl>
                                                    <FormLabel className="font-normal">Individual (₦10,000 / ticket)</FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl><RadioGroupItem value="general" /></FormControl>
                                                    <FormLabel className="font-normal">General (₦90,000 / 50 tickets)</FormLabel>
                                                </FormItem>
                                            </RadioGroup>
                                        </FormControl>
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
                                        <FormControl><Input type="number" {...field} className="h-12" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            </>
                        )}
                        {eventType === 'tiered' && (
                           <div className="space-y-4">
                                <h3 className="font-semibold">Ticket Tiers</h3>
                                {fields.map((field, index) => (
                                    <div key={field.id} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                                        <FormField
                                            control={form.control}
                                            name={`tiers.${index}.name`}
                                            render={({ field }) => <FormItem className="col-span-4"><FormLabel>Tier Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`tiers.${index}.price`}
                                            render={({ field }) => <FormItem className="col-span-3"><FormLabel>Price</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`tiers.${index}.quantity`}
                                            render={({ field }) => <FormItem className="col-span-3"><FormLabel>Quantity</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>}
                                        />
                                        <div className="col-span-2">
                                            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                ))}
                                <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => append({ name: '', price: 0, quantity: 50 })}
                                >
                                Add Tier
                                </Button>
                                <FormDescription>Pricing: Tier 1 (50k/50), Tier 2 (60k/40), Tier 3 (70k/20), Tier 4 (10k/5), Tier 5 (20k/1). Names on Tiers 4 & 5.</FormDescription>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <Button type="submit" size="lg">Publish Event</Button>
                </div>
                </>
            )}
          </div>

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
