
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
import { CalendarIcon, Image as ImageIcon, MapPin, Plus, Video, Sparkles, Ticket, Upload, RefreshCw, Trash2, PartyPopper, Users, Star, ArrowLeft } from "lucide-react"
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
import { usePaystackPayment } from "react-paystack";
import { v4 as uuidv4 } from "uuid";
import { Label } from "@/components/ui/label"

const tierSchema = z.object({
  name: z.string().min(1, "Tier name is required."),
  price: z.coerce.number().min(0, "Price must be non-negative."),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
});

const eventFormSchema = z.object({
  eventType: z.enum(['regular', 'premium', 'tiered'], { required_error: "You must select an event type." }),
  tieredSubType: z.string().optional(),
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
  price: z.coerce.number().min(0, "Price must be non-negative.").default(0), // For regular/premium events
  tiers: z.array(tierSchema).optional(),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

const allBackgrounds = backgroundsData.backgrounds;

const TIER_FEES = {
    regular: { fee: 7000, maxTickets: 50 },
    premium: { fee: 9000, maxTickets: 50 },
    'tiered-1': { fee: 5000, maxTickets: 50 },
    'tiered-2': { fee: 6000, maxTickets: 40 },
    'tiered-3': { fee: 7000, maxTickets: 20 },
    'tiered-4': { fee: 10000, maxTickets: 5 },
    'tiered-5': { fee: 20000, maxTickets: 1 },
};

type TierKey = keyof typeof TIER_FEES;

export default function CreateEventPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [displayedBackgrounds, setDisplayedBackgrounds] = useState<{id: string; url: string}[]>([]);
  const [currentStep, setCurrentStep] = useState(1);

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
  
  const eventType = form.watch('eventType');
  const tieredSubType = form.watch('tieredSubType');

  const getTierKey = useCallback((): TierKey | null => {
    if (eventType === 'tiered' && tieredSubType) {
        return `tiered-${tieredSubType}` as TierKey;
    }
    if (eventType === 'regular' || eventType === 'premium') {
        return eventType;
    }
    return null;
  }, [eventType, tieredSubType]);

  const getCurrentFee = useCallback(() => {
      const key = getTierKey();
      return key && TIER_FEES[key] ? TIER_FEES[key].fee : 0;
  }, [getTierKey]);

  const paystackConfig = {
    reference: uuidv4(),
    email: user?.email || '',
    amount: getCurrentFee() * 100, // Amount in kobo
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
  };
  
  const initializePayment = usePaystackPayment(paystackConfig);

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

  const saveEventToDB = (data: EventFormValues) => {
    const tierKey = getTierKey();
    if (!user || !firestore || !tierKey) {
        toast({ variant: 'destructive', title: 'Error', description: 'Authentication or database error.' });
        return;
    }
    const eventCollectionRef = collection(firestore, 'events');
    const tierInfo = TIER_FEES[tierKey];

    const eventData = {
        ...data,
        date: data.date.toISOString(),
        vendorId: user.uid,
        organizer: user.displayName, 
        status: 'approved',
        platformFee: tierInfo.fee,
        maxTickets: tierInfo.maxTickets,
    };
    
    addDocumentNonBlocking(eventCollectionRef, eventData);

    toast({
        title: "Event Created",
        description: `Your event "${data.name}" has been successfully created and is now live.`,
    });
    
    const isAdmin = (userData?.roles || []).includes('admin');
    router.push(isAdmin ? '/admin/events' : '/vendor/dashboard');
  }

  const onPaymentSuccess = () => {
    saveEventToDB(form.getValues());
  };

  const onPaymentClose = () => {
    toast({
      variant: 'destructive',
      title: 'Payment Canceled',
      description: 'The payment process was not completed.',
    });
  };

  const onSubmit = (data: EventFormValues) => {
    const fee = getCurrentFee();
    if (fee > 0) {
       if (!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY.startsWith('pk_test_xxxx')) {
            toast({
                variant: 'destructive',
                title: 'Setup Required',
                description: 'The Paystack public key is not configured in the .env file.',
            });
            return;
        }
      initializePayment({onSuccess: onPaymentSuccess, onClose: onPaymentClose});
    } else {
      saveEventToDB(data);
    }
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
  
  const TIER_DESCRIPTIONS = {
    '1': { name: 'Tier 1', fee: TIER_FEES['tiered-1'].fee, tickets: TIER_FEES['tiered-1'].maxTickets },
    '2': { name: 'Tier 2', fee: TIER_FEES['tiered-2'].fee, tickets: TIER_FEES['tiered-2'].maxTickets },
    '3': { name: 'Tier 3', fee: TIER_FEES['tiered-3'].fee, tickets: TIER_FEES['tiered-3'].maxTickets },
    '4': { name: 'Tier 4 (Private)', fee: TIER_FEES['tiered-4'].fee, tickets: TIER_FEES['tiered-4'].maxTickets },
    '5': { name: 'Tier 5 (Private)', fee: TIER_FEES['tiered-5'].fee, tickets: TIER_FEES['tiered-5'].maxTickets },
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
  
  const handleNextStep = () => {
      const eventType = form.getValues('eventType');
      if (eventType === 'tiered') {
          setCurrentStep(2);
      } else {
          setCurrentStep(3);
      }
  }

  const renderStep = () => {
      switch (currentStep) {
          case 1:
              return (
                <div className="space-y-8">
                     <FormField
                        control={form.control}
                        name="eventType"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel className="text-xl font-bold">Step 1: Choose Event Type</FormLabel>
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormItem>
                                            <Label className={cn("flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground h-full cursor-pointer", field.value === 'regular' && 'border-primary ring-2 ring-primary')}>
                                                <FormControl>
                                                    <RadioGroupItem value="regular" className="sr-only" />
                                                </FormControl>
                                                <PartyPopper className="mb-3 h-8 w-8" />
                                                <span className="font-bold">Regular Event</span>
                                                <span className="text-xs text-muted-foreground text-center mt-1">₦{TIER_FEES.regular.fee.toLocaleString()} for {TIER_FEES.regular.maxTickets} tickets.</span>
                                            </Label>
                                        </FormItem>
                                        <FormItem>
                                            <Label className={cn("flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground h-full cursor-pointer", field.value === 'premium' && 'border-primary ring-2 ring-primary')}>
                                                <FormControl>
                                                    <RadioGroupItem value="premium" className="sr-only" />
                                                </FormControl>
                                                <Star className="mb-3 h-8 w-8" />
                                                <span className="font-bold">Premium Event</span>
                                                <span className="text-xs text-muted-foreground text-center mt-1">₦{TIER_FEES.premium.fee.toLocaleString()} for {TIER_FEES.premium.maxTickets} tickets with custom designs.</span>
                                            </Label>
                                        </FormItem>
                                        <FormItem>
                                            <Label className={cn("flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground h-full cursor-pointer", field.value === 'tiered' && 'border-primary ring-2 ring-primary')}>
                                                <FormControl>
                                                    <RadioGroupItem value="tiered" className="sr-only" />
                                                </FormControl>
                                                <Users className="mb-3 h-8 w-8" />
                                                <span className="font-bold">Tiered Event</span>
                                                <span className="text-xs text-muted-foreground text-center mt-1">Offer multiple ticket types with different pricing.</span>
                                            </Label>
                                        </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="flex justify-end pt-4">
                        <Button type="button" onClick={handleNextStep} disabled={!eventType}>
                            Next Step <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                        </Button>
                    </div>
                </div>
              );
        case 2:
            return (
                <div className="space-y-8">
                     {eventType === 'tiered' ? (
                        <FormField
                            control={form.control}
                            name="tieredSubType"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel className="text-xl font-bold">Step 2: Choose Tiered Plan</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {Object.entries(TIER_DESCRIPTIONS).map(([key, { name, fee, tickets }]) => (
                                                <FormItem key={key}>
                                                     <Label className={cn("flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground h-full cursor-pointer", field.value === key && 'border-primary ring-2 ring-primary')}>
                                                        <FormControl>
                                                            <RadioGroupItem value={key} className="sr-only" />
                                                        </FormControl>
                                                        <span className="font-bold">{name}</span>
                                                        <span className="text-xl font-headline my-1">₦{fee.toLocaleString()}</span>
                                                        <span className="text-xs text-muted-foreground">{tickets} tickets max</span>
                                                    </Label>
                                                </FormItem>
                                            ))}
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                     ) : (
                         <div className="text-center bg-accent/20 p-8 rounded-lg">
                             <h2 className="text-xl font-bold">Step 2: Event Details</h2>
                             <p className="text-muted-foreground">You've selected a <span className="font-bold text-primary">{eventType}</span> event. Proceed to the next step to add details.</p>
                         </div>
                     )}
                    <div className="flex justify-between pt-4">
                        <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                             <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        <Button type="button" onClick={() => setCurrentStep(3)} disabled={eventType === 'tiered' && !tieredSubType}>
                            Next Step <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                        </Button>
                    </div>
                </div>
            );
        case 3:
             const key = getTierKey();
             const currentTierInfo = key ? TIER_FEES[key] : null;

            return (
                 <div className="space-y-8">
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold">Step 3: Add Your Event Details</h2>
                         {currentTierInfo && (
                            <p className="text-muted-foreground">
                                You are creating a <span className="font-bold text-primary">{eventType} {eventType === 'tiered' ? `(Tier ${tieredSubType})` : ''}</span> event.
                                The fee is <span className="font-bold">₦{currentTierInfo.fee.toLocaleString()}</span> for a maximum of <span className="font-bold">{currentTierInfo.maxTickets}</span> tickets.
                            </p>
                        )}
                    </div>
                    
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
                    
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Event Title</FormLabel> <FormControl> <Input {...field} placeholder="My Awesome Event" className="text-xl font-bold h-auto py-2" /> </FormControl> <FormMessage /> </FormItem> )}/>

                    <div className="flex items-start gap-4">
                        <CalendarIcon className="h-6 w-6 text-muted-foreground mt-2"/>
                        <div className="grid gap-4 flex-grow grid-cols-1 sm:grid-cols-2">
                            <FormField control={form.control} name="date" render={({ field }) => ( <FormItem> <Popover> <PopoverTrigger asChild> <FormControl> <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal h-12", !field.value && "text-muted-foreground")}> {field.value ? format(field.value, "PPP") : <span>Pick a date</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" /> </Button> </FormControl> </PopoverTrigger> <PopoverContent className="w-auto p-0" align="start"> <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /> </PopoverContent> </Popover> <FormMessage /> </FormItem> )}/>
                            <div className="flex gap-2">
                                <FormField control={form.control} name="startTime" render={({ field }) => ( <FormItem className="flex-grow"> <FormControl><Input type="time" {...field} className="h-12"/></FormControl> <FormMessage /> </FormItem> )}/>
                                <FormField control={form.control} name="endTime" render={({ field }) => ( <FormItem className="flex-grow"> <FormControl><Input type="time" {...field} className="h-12"/></FormControl> <FormMessage /> </FormItem> )}/>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="h-6 w-6 text-muted-foreground mt-2 flex items-center justify-center">
                            {isOnline ? <Video className="h-6 w-6"/> : <MapPin className="h-6 w-6"/>}
                        </div>
                        <div className="grid gap-4 flex-grow">
                            <FormField control={form.control} name="isOnline" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-card"> <div className="space-y-0.5"> <FormLabel>Online event</FormLabel> </div> <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl> </FormItem> )}/>
                            {!isOnline && (
                                <FormField control={form.control} name="location" render={({ field }) => ( <FormItem> <FormControl> <div className="relative"> <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /> <Input placeholder="Add a venue or address" {...field} className="h-12 pl-10" /> </div> </FormControl> <FormMessage /> </FormItem> )}/>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex items-start gap-4"> <Sparkles className="h-6 w-6 text-muted-foreground mt-2"/> <div className="grid gap-4 flex-grow"> <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormControl><Textarea placeholder="Add a description..." {...field} className="min-h-32" /></FormControl> <FormMessage /> </FormItem> )}/> </div> </div>
                    
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
                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-3 gap-4">
                                            {displayedBackgrounds.map((bg) => (
                                                <FormItem key={bg.id}>
                                                     <Label className={cn("flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground h-28 cursor-pointer", field.value === bg.url && 'border-primary ring-2 ring-primary')}>
                                                        <FormControl>
                                                          <RadioGroupItem value={bg.url} className="sr-only" />
                                                        </FormControl>
                                                        <Image src={bg.url} alt={`background ${bg.id}`} width={120} height={100} className="w-full h-full object-cover rounded-sm" />
                                                    </Label>
                                                </FormItem>
                                            ))}
                                        </RadioGroup>
                                    </FormControl>
                                    {eventType === 'regular' && <FormDescription className="text-xs">Regular events are limited to these background options.</FormDescription>}
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <Ticket className="h-6 w-6 text-muted-foreground mt-2"/>
                        <div className="grid gap-4 flex-grow">
                             {eventType === 'tiered' ? (
                               <div className="space-y-4">
                                    <h3 className="font-semibold">Ticket Tiers</h3>
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                                            <FormField control={form.control} name={`tiers.${index}.name`} render={({ field }) => <FormItem className="col-span-4"><FormLabel>Tier Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                                            <FormField control={form.control} name={`tiers.${index}.price`} render={({ field }) => <FormItem className="col-span-3"><FormLabel>Price</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                                            <FormField control={form.control} name={`tiers.${index}.quantity`} render={({ field }) => <FormItem className="col-span-3"><FormLabel>Quantity</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                                            <div className="col-span-2"> <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button> </div>
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', price: 0, quantity: 50 })}> Add Tier </Button>
                                </div>
                            ) : (
                                <FormField control={form.control} name="price" render={({ field }) => ( <FormItem> <FormLabel>Ticket Price (NGN)</FormLabel> <FormControl><Input type="number" {...field} className="h-12" /></FormControl> <FormDescription>Set the price for a single ticket.</FormDescription> <FormMessage /> </FormItem> )}/>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => setCurrentStep(eventType === 'tiered' ? 2 : 1)}>
                             <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? 'Processing...' : `Pay ₦${getCurrentFee().toLocaleString()} and Publish`}
                        </Button>
                    </div>
                </div>
            )
      }
  }

  return (
    <div className="bg-muted/30 min-h-screen">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 max-w-6xl mx-auto py-10 px-4">
          
          <div className="space-y-8">
            {renderStep()}
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
