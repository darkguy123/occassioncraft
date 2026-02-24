
'use client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller } from "react-hook-form"
import * as z from "zod"
import { Button, buttonVariants } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useRouter, useSearchParams } from "next/navigation"
import { useFirebase, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import type { User as UserType, Event as EventType, Ticket, Vendor as VendorType } from "@/lib/types";
import { doc, collection, query, where } from "firebase/firestore";
import { Suspense, useEffect, useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { TicketStylePreview } from "@/components/ticket-style-preview"
import Image from "next/image"
import { generateBackgroundImage } from "@/ai/flows/generate-ticket-image-flow"
import { Loader2, Wand2, Info, Plus, Upload, ShoppingCart, Check, PartyPopper, Shuffle, AlertTriangle } from "lucide-react"
import { v4 as uuidv4 } from 'uuid';
import { useCart, type CartItem } from "@/context/cart-context"
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Badge } from "@/components/ui/badge";
import { ImageCropperDialog } from "@/components/shared/image-cropper-dialog";
import backgroundsData from '@/lib/ticket-backgrounds.json';
import { isBefore, startOfToday } from 'date-fns';

const ticketFormSchema = z.object({
  eventId: z.string().optional(),
  package: z.enum(["Regular", "Premium Individual", "Premium General", "Tiered"]),
  packageQuantity: z.coerce.number().min(1, { message: "Quantity must be at least 1."}).default(1),
  tier: z.string().optional(),
  class: z.string().optional(),
  attendeeName: z.string().optional(),
  guestPhotoUrl: z.string().optional(),
  isPrivate: z.boolean().default(false),
  maxScans: z.number().min(1).default(1),
  
  // Design fields
  ticketImageUrl: z.string().optional(),
  ticketBrandingImageUrl: z.string().optional(),
}).refine(data => {
    if (data.package === 'Tiered' && !data.tier) {
        return false;
    }
    return true;
}, {
    message: "Please select a tier for the Tiered package.",
    path: ["tier"],
});

export type TicketFormValues = z.infer<typeof ticketFormSchema>;

const packages = {
  "Regular": { price: 70000, tickets: 50, templates: 5 },
  "Premium Individual": { price: 10000, tickets: 1, templates: 10 },
  "Premium General": { price: 90000, tickets: 50, templates: 10 },
  "Tiered": {
    "Tier 1": { price: 50000, tickets: 50 },
    "Tier 2": { price: 60000, tickets: 40 },
    "Tier 3": { price: 70000, tickets: 20 },
    "Tier 4": { price: 10000, tickets: 5 },
    "Tier 5": { price: 20000, tickets: 1 },
  }
};

const PageSkeleton = () => (
    <div className="container max-w-6xl mx-auto py-10 px-4">
        <div className="space-y-2 mb-8">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-6 w-1/3" />
        </div>
        <div className="grid md:grid-cols-2 gap-12">
        <div><Skeleton className="h-[600px] w-full" /></div>
        <div><Skeleton className="h-[400px] w-full" /></div>
        </div>
    </div>
);


export default function CreateTicketPage() {
    return (
        <Suspense fallback={<PageSkeleton />}>
            <CreateTicketPageContent />
        </Suspense>
    )
}

function CreateTicketPageContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isUserLoading, firestore, storage } = useFirebase();
  const { addToCart } = useCart();
  
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [lastAddedCartItem, setLastAddedCartItem] = useState<CartItem | null>(null);
  const [showNoEventsDialog, setShowNoEventsDialog] = useState(false);

  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserType>(userDocRef);

  const vendorDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'vendors', user.uid);
  }, [firestore, user]);

  const { data: vendorData, isLoading: isVendorDataLoading } = useDoc<VendorType>(vendorDocRef);
  
  const vendorEventsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'events'), where('vendorId', '==', user.uid));
  }, [user, firestore]);

  const { data: vendorEvents, isLoading: areEventsLoading } = useCollection<EventType>(vendorEventsQuery);

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      eventId: '',
      package: 'Regular',
      packageQuantity: 1,
      tier: '',
      class: '',
      attendeeName: '',
      guestPhotoUrl: '',
      maxScans: 1,
      isPrivate: false,
      ticketImageUrl: '',
      ticketBrandingImageUrl: '',
    },
    mode: "onChange",
  });

  useEffect(() => {
    const eventIdFromQuery = searchParams.get('eventId');
    if (eventIdFromQuery) {
        form.setValue('eventId', eventIdFromQuery);
    }
  }, [searchParams, form]);
  
  const selectedPackage = form.watch('package');
  const selectedTier = form.watch('tier');
  const packageQuantity = form.watch('packageQuantity');
  const selectedEventId = form.watch('eventId');

  const selectedEvent = useMemo(() => {
    return vendorEvents?.find(e => e.id === selectedEventId);
  }, [vendorEvents, selectedEventId]);

  const isEventExpired = useMemo(() => {
    if (!selectedEvent || !selectedEvent.dates || selectedEvent.dates.length === 0) return false;
    const lastEventDateItem = selectedEvent.dates[selectedEvent.dates.length - 1];
    if (!lastEventDateItem?.date) return false;
    return isBefore(new Date(lastEventDateItem.date), startOfToday());
  }, [selectedEvent]);

  const summary = useMemo(() => {
    let basePrice = 0;
    let baseTickets = 0;
    const quantity = packageQuantity > 0 ? packageQuantity : 1;

    if (selectedPackage === 'Tiered') {
        if (selectedTier && packages.Tiered[selectedTier as keyof typeof packages.Tiered]) {
            const tierDetails = packages.Tiered[selectedTier as keyof typeof packages.Tiered];
            basePrice = tierDetails.price;
            baseTickets = tierDetails.tickets;
        }
    } else if (packages[selectedPackage]) {
        const packageDetails = packages[selectedPackage];
        basePrice = packageDetails.price;
        baseTickets = packageDetails.tickets;
    }
    return { 
        price: basePrice * quantity,
        tickets: baseTickets * quantity,
        basePrice: basePrice,
    };
  }, [selectedPackage, selectedTier, packageQuantity]);

  const onSubmit = (data: TicketFormValues) => {
    if (!user) return;
    const linkedEvent = vendorEvents?.find(e => e.id === data.eventId);

    const cartItem: CartItem = {
      id: uuidv4(),
      ...data,
      eventId: data.eventId || '',
      price: summary.price,
      quantity: summary.tickets,
      eventName: linkedEvent?.name || 'Standalone Ticket',
    };
    
    addToCart(cartItem);
    setLastAddedCartItem(cartItem);
    setIsSuccessDialogOpen(true);
  };
  
  const handleCraftAnother = () => {
    form.reset();
    setLastAddedCartItem(null);
    setIsSuccessDialogOpen(false);
  }
  
  const handleViewCart = () => {
    setIsSuccessDialogOpen(false);
    router.push('/vendor/checkout');
  }

  useEffect(() => {
    const isLoading = isUserLoading || isUserDataLoading || isVendorDataLoading;
    if (isLoading) {
      setAuthStatus('loading');
      return;
    }
    if (!user) {
      router.push('/login?redirect=/create-ticket');
      setAuthStatus('unauthorized');
      return;
    }
    
    const hasVendorRole = (userData?.roles || []).includes('vendor');
    const isAdminRole = (userData?.roles || []).includes('admin');
    const isVendorApproved = vendorData?.status === 'approved';

    const isAuthorized = isAdminRole || hasVendorRole || isVendorApproved;
    
    if (isAuthorized) {
        setAuthStatus('authorized');
    } else {
        setAuthStatus('unauthorized');
        toast({ variant: "destructive", title: "Unauthorized", description: "You must be an approved vendor to craft tickets." });
        router.push('/vendor/dashboard');
    }
  }, [isUserLoading, isUserDataLoading, isVendorDataLoading, user, userData, vendorData, router, toast]);

  useEffect(() => {
    // This effect should run after authentication and event data are loaded.
    if (authStatus === 'authorized' && !areEventsLoading) {
      if (!vendorEvents || vendorEvents.length === 0) {
        setShowNoEventsDialog(true);
      }
    }
  }, [authStatus, areEventsLoading, vendorEvents]);

  const handleFileUpload = async (file: File | null, field: keyof TicketFormValues) => {
    if (!file) {
      return;
    }
    if (!user || !storage) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to upload images.' });
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Image must be smaller than 4MB.' });
      return;
    }

    setIsUploading(true);

    try {
      const filePath = `public-uploads/ticket-assets/${user.uid}/${uuidv4()}-${file.name}`;
      const storageRef = ref(storage, filePath);

      const uploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      form.setValue(field, downloadURL, { shouldValidate: true });
      toast({ title: 'Image Uploaded', description: 'Your image has been saved.' });
    } catch (error: any) {
      console.error("Upload error:", error);
      let description = error.message || 'Could not upload the image.';
      if (error.code === 'storage/retry-limit-exceeded') {
          description = "The network request timed out. This can happen if Firebase Storage is not enabled for this project. Please go to the Firebase Console, navigate to Storage, and complete the setup process."
      } else if (error.code === 'storage/unauthorized') {
          description = "You don't have permission to upload files. Please ensure you are logged in."
      }
      toast({ variant: 'destructive', title: 'Upload Failed', description: description });
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenCropper = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) { // 4MB limit
      toast({ variant: 'destructive', title: 'File too large', description: 'Image must be smaller than 4MB.' });
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
      setIsCropperOpen(true);
    };
    reader.readAsDataURL(file);
    
    event.target.value = "";
  };

  const onCrop = async (croppedImageBase64: string) => {
    setIsCropperOpen(false);
    if (!user || !storage) {
      toast({ variant: 'destructive', title: 'Authentication Error' });
      return;
    }
    
    const dataURItoBlob = (dataURI: string): Blob => {
        const byteString = atob(dataURI.split(',')[1]);
        const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], {type: mimeString});
    };

    const blob = dataURItoBlob(croppedImageBase64);
    const file = new File([blob], `ticket-bg-${uuidv4()}.png`, { type: 'image/png' });
    
    await handleFileUpload(file, 'ticketImageUrl');
    setImageToCrop(null);
  };
  
  const handleGenerateImage = async () => {
    if (!user || !storage) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to generate images.' });
      return;
    }
    const prompt = "abstract background for an event ticket, aspect ratio 2:3";
    setIsGenerating(true);
    try {
      const dataUri = await generateBackgroundImage(prompt);

      const dataURItoBlob = (dataURI: string): Blob => {
          const byteString = atob(dataURI.split(',')[1]);
          const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
          }
          return new Blob([ab], {type: mimeString});
      };
      
      const imageBlob = dataURItoBlob(dataUri);
      const file = new File([imageBlob], `ai-${uuidv4()}.png`, { type: 'image/png' });
      
      await handleFileUpload(file, 'ticketImageUrl');

      toast({ title: "AI Background Generated!", description: "A new background image has been applied." });
    } catch (error: any) {
      console.error("AI Image Generation/Upload error:", error);
      toast({ variant: 'destructive', title: 'Generation Failed', description: error.message || 'Could not generate an image at this time.' });
    } finally {
      setIsGenerating(false);
    }
  }

  const handleRandomImage = () => {
    const backgrounds = backgroundsData.backgrounds;
    if (backgrounds.length > 0) {
      const randomIndex = Math.floor(Math.random() * backgrounds.length);
      const randomImageUrl = backgrounds[randomIndex].url;
      form.setValue('ticketImageUrl', randomImageUrl, { shouldValidate: true });
      toast({ title: 'Random Background Applied' });
    } else {
      toast({ variant: 'destructive', title: 'No Backgrounds Available', description: "An admin needs to upload background images." });
    }
  };


  if (authStatus !== 'authorized' || areEventsLoading) {
    return <PageSkeleton />;
  }

  const isPremiumPackage = selectedPackage.startsWith('Premium');

  return (
    <>
    {imageToCrop && (
        <ImageCropperDialog
            isOpen={isCropperOpen}
            onClose={() => setIsCropperOpen(false)}
            imageSrc={imageToCrop}
            onCrop={onCrop}
            aspectRatio={2 / 3}
        />
    )}

    <AlertDialog open={showNoEventsDialog}>
      <AlertDialogContent>
          <AlertDialogHeader>
              <AlertDialogTitle>Create an Event First</AlertDialogTitle>
              <AlertDialogDescription>
                  You must have at least one published event to craft a ticket.
              </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
              <Button variant="outline" onClick={() => router.push('/vendor/dashboard')}>Go to Dashboard</Button>
              <Button asChild>
                  <Link href="/create-event">Create Event</Link>
              </Button>
          </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <div className="container max-w-6xl mx-auto py-10 px-4">
        <div className="space-y-2 mb-8">
            <h1 className="text-4xl font-bold font-headline">Craft a New Ticket</h1>
            <p className="text-muted-foreground">Design and configure a new batch of tickets for one of your events.</p>
        </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid md:grid-cols-2 gap-12">
            <div className="space-y-8">
                {/* Event Linking */}
                <FormField
                  control={form.control}
                  name="eventId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link to Event (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an event you've created..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vendorEvents && vendorEvents.length > 0 ? vendorEvents.map(event => {
                            const lastEventDateItem = event.dates?.[event.dates.length - 1];
                            const isExpired = lastEventDateItem?.date && isBefore(new Date(lastEventDateItem.date), startOfToday());
                            return (
                                <SelectItem 
                                    key={event.id} 
                                    value={event.id}
                                    disabled={isExpired || (!!event.status && event.status !== 'published')}
                                >
                                    <div className="flex items-center justify-between w-full">
                                      <span>{event.name}</span>
                                      <div className='flex items-center gap-2'>
                                        {isExpired && (
                                            <Badge variant="destructive" className="ml-2">Expired</Badge>
                                        )}
                                        {!!event.status && event.status !== 'published' && !isExpired && (
                                            <Badge variant="outline" className="ml-2 capitalize">
                                            {event.status}
                                            </Badge>
                                        )}
                                      </div>
                                    </div>
                                </SelectItem>
                            )
                          }) : (
                            <div className="p-4 text-sm text-muted-foreground">No events found. Please <Link href="/create-event" className="underline text-primary">create an event</Link> first.</div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isEventExpired && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Event Has Ended</AlertTitle>
                        <AlertDescription>
                            This event has already passed. You cannot craft new tickets for it.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Package Selection */}
                <FormField
                  control={form.control}
                  name="package"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Choose a Package</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => {
                              field.onChange(value);
                              form.setValue('tier', '');
                          }}
                          defaultValue={field.value}
                          className="grid grid-cols-2 gap-4"
                        >
                          {Object.keys(packages).map((p) => (
                             <FormItem key={p}>
                                <RadioGroupItem value={p} id={p} className="sr-only peer" />
                                <Label 
                                  htmlFor={p} 
                                  className="flex h-full flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-destructive peer-data-[state=checked]:shadow-md relative cursor-pointer"
                                >
                                  <div className="absolute top-2 right-2 hidden h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground peer-data-[state=checked]:flex">
                                      <Check className="h-3 w-3" />
                                  </div>
                                  <span className="font-semibold text-center">{p}</span>
                                </Label>
                              </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tiered Sub-options */}
                {selectedPackage === 'Tiered' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Select a Tier</CardTitle>
                    </CardHeader>
                    <CardContent>
                       <FormField
                          control={form.control}
                          name="tier"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormControl>
                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value || ''} className="space-y-2">
                                  {Object.entries(packages.Tiered).map(([name, details]) => (
                                    <FormItem key={name}>
                                      <FormControl>
                                         <Label className="flex items-center justify-between rounded-md border p-3 has-[:checked]:border-primary">
                                            <div>
                                              <p className="font-semibold">{name}</p>
                                              <p className="text-sm text-muted-foreground">
                                                {details.tickets} tickets for ₦{details.price.toLocaleString()}
                                              </p>
                                            </div>
                                            <RadioGroupItem value={name} />
                                         </Label>
                                      </FormControl>
                                    </FormItem>
                                  ))}
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    </CardContent>
                  </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Quantity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <FormField
                            control={form.control}
                            name="packageQuantity"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Package Quantity</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        placeholder="1"
                                        {...field}
                                        onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                                        min={1}
                                    />
                                </FormControl>
                                <FormDescription>How many of this package do you want to buy? The price and ticket count will be multiplied.</FormDescription>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                 {isPremiumPackage && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Premium Design Options</CardTitle>
                            <CardDescription>Customize the look of your premium tickets.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField
                                control={form.control}
                                name="ticketImageUrl"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ticket Background</FormLabel>
                                    <FormDescription>Select a pre-made background, or use the options below to create your own.</FormDescription>
                                    <FormControl>
                                        <div>
                                            <RadioGroup
                                            onValueChange={field.onChange}
                                            value={field.value || ''}
                                            className="grid grid-cols-4 gap-2 pt-2"
                                            >
                                            {backgroundsData.backgrounds.map((bg) => (
                                                <FormItem key={bg.id}>
                                                <FormControl>
                                                    <RadioGroupItem value={bg.url} id={bg.id} className="sr-only" />
                                                </FormControl>
                                                <Label
                                                    htmlFor={bg.id}
                                                    className="block aspect-[2/3] w-full rounded-md border-2 border-transparent bg-popover hover:border-primary peer-data-[state=checked]:border-primary cursor-pointer overflow-hidden relative group"
                                                >
                                                    <Image
                                                        src={bg.url}
                                                        alt={`Background ${bg.id}`}
                                                        fill
                                                        className="object-cover transition-transform group-hover:scale-105"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 peer-data-[state=checked]:opacity-100 transition-opacity">
                                                        <Check className="h-8 w-8 text-white" />
                                                    </div>
                                                </Label>
                                                </FormItem>
                                            ))}
                                            </RadioGroup>
                                            
                                            <div className="relative my-6">
                                                <div className="absolute inset-0 flex items-center">
                                                    <span className="w-full border-t" />
                                                </div>
                                                <div className="relative flex justify-center text-xs uppercase">
                                                    <span className="bg-card px-2 text-muted-foreground">Or customize</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                            {form.watch('ticketImageUrl') ? (
                                                <Image src={form.watch('ticketImageUrl')!} alt="background" width={64} height={96} className="rounded-md h-24 w-16 object-cover" />
                                            ) : (
                                                <div className="h-24 w-16 rounded-md bg-muted flex items-center justify-center"><Info className="h-6 w-6 text-muted-foreground"/></div>
                                            )}
                                            <div className="flex flex-col items-start gap-2">
                                                <p className="text-xs text-muted-foreground">Upload, generate with AI, or get a random image.</p>
                                                <div className="flex gap-2">
                                                    <Button asChild variant="outline" size="icon" className="cursor-pointer">
                                                        <label htmlFor="bg-upload">
                                                            <Upload className="h-4 w-4" />
                                                            <span className="sr-only">Upload</span>
                                                        </label>
                                                    </Button>
                                                    <Input id="bg-upload" type="file" className="hidden" accept="image/*" onChange={handleOpenCropper} disabled={isUploading || isGenerating} />
                                                    <Button variant="outline" size="icon" onClick={handleGenerateImage} disabled={isGenerating || isUploading}>
                                                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin"/> : <Wand2 className="h-4 w-4" />}
                                                        <span className="sr-only">Generate with AI</span>
                                                    </Button>
                                                    <Button variant="outline" size="icon" onClick={handleRandomImage} disabled={isGenerating || isUploading}>
                                                        <Shuffle className="h-4 w-4" />
                                                        <span className="sr-only">Random background</span>
                                                    </Button>
                                                </div>
                                            </div>
                                            </div>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="ticketBrandingImageUrl"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Branding Image (e.g. Logo)</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center gap-4">
                                            {form.watch('ticketBrandingImageUrl') && <Image src={form.watch('ticketBrandingImageUrl')!} alt="branding" width={100} height={60} className="rounded-md h-12 w-20 object-contain bg-muted" />}
                                            <Button asChild variant="outline">
                                                <label htmlFor="brand-upload" className="cursor-pointer"><Upload className="mr-2 h-4 w-4" /> Upload</label>
                                            </Button>
                                            <Input id="brand-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e.target.files?.[0] || null, 'ticketBrandingImageUrl')} disabled={isUploading} />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                 )}

                {/* Premium Individual Options */}
                {selectedPackage === 'Premium Individual' && (
                    <Card>
                        <CardHeader><CardTitle>Premium Individual Options</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="attendeeName"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Guest Name</FormLabel>
                                    <FormControl><Input {...field} placeholder="Enter the guest's full name" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="class"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ticket Class</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a class..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Regular">Regular</SelectItem>
                                        <SelectItem value="VIP">VIP</SelectItem>
                                        <SelectItem value="VVIP">VVIP</SelectItem>
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="guestPhotoUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Guest Photo (Optional)</FormLabel>
                                        <FormControl>
                                            <div className="flex items-center gap-4">
                                                {form.watch('guestPhotoUrl') && <Image src={form.watch('guestPhotoUrl')!} alt="guest" width={48} height={48} className="rounded-full h-12 w-12 object-cover" />}
                                                <Button asChild variant="outline">
                                                    <label htmlFor="guest-photo-upload" className="cursor-pointer">
                                                        <Upload className="mr-2 h-4 w-4" /> Upload
                                                    </label>
                                                </Button>
                                                <Input id="guest-photo-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e.target.files?.[0] || null, 'guestPhotoUrl')} disabled={isUploading} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                )}

                {/* General Options */}
                <Card>
                    <CardHeader><CardTitle>General Options</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="maxScans"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Maximum Scans Per Ticket</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        const num = parseInt(value, 10);
                                        field.onChange(isNaN(num) ? '' : num);
                                    }}
                                    value={field.value ?? ''}
                                  />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="isPrivate"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                    <FormLabel>Private Ticket</FormLabel>
                                    <FormDescription className="text-xs">If checked, this ticket will not be publicly listed.</FormDescription>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
            </div>
            
            {/* Right Column - Preview and Summary */}
            <div className="space-y-8">
                <div className="sticky top-24 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Ticket Preview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TicketStylePreview eventData={{...form.watch(), name: selectedEvent?.name }} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <Alert>
                                <Info className="h-4 w-4" />
                                <AlertTitle>You're about to add to your cart:</AlertTitle>
                                <AlertDescription className="mt-2">
                                    <p><span className="font-semibold">{summary.tickets} ticket(s)</span> for the <span className="font-semibold">{selectedPackage} {selectedTier || ''}</span> package.</p>
                                     {packageQuantity > 1 && <p className="text-xs text-muted-foreground">{packageQuantity} packages at ₦{summary.basePrice.toLocaleString()} each.</p>}
                                </AlertDescription>
                            </Alert>
                            <div className="mt-6 flex justify-between items-center text-lg font-bold">
                                <span>Total Price:</span>
                                <span>₦{summary.price.toLocaleString()}</span>
                            </div>
                        </CardContent>
                    </Card>
                     <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting || summary.price <= 0 || isEventExpired}>
                        <ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart
                    </Button>
                </div>
            </div>
        </form>
      </Form>
    </div>

    <AlertDialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader className="text-center items-center">
                <PartyPopper className="h-12 w-12 text-primary" />
                <AlertDialogTitle className="text-2xl">Added to Cart!</AlertDialogTitle>
                <AlertDialogDescription>
                    Your ticket batch has been successfully added to your cart.
                </AlertDialogDescription>
            </AlertDialogHeader>
            
            {lastAddedCartItem && (
                <div className="my-4 rounded-lg border bg-secondary/50 p-4 space-y-2 text-sm">
                    <h4 className="font-semibold">Your Item:</h4>
                    <p><span className="font-medium">{lastAddedCartItem.quantity} x {lastAddedCartItem.package} {lastAddedCartItem.tier || ''} tickets</span> for <span className="font-medium">{lastAddedCartItem.eventName}</span></p>
                    <p className="text-lg font-bold">Total: ₦{lastAddedCartItem.price.toLocaleString()}</p>
                </div>
            )}

            <AlertDialogFooter className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button variant="outline" onClick={handleCraftAnother}>
                    Craft Another Ticket
                </Button>
                 <Button onClick={handleViewCart}>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    View Cart & Checkout
                </Button>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
