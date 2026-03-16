'use client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useRouter, useSearchParams } from "next/navigation"
import { useFirebase, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import type { User as UserType, Event as EventType, Vendor as VendorType } from "@/lib/types";
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
import { Loader2, Wand2, Upload, ShoppingCart, Check, Shuffle, AlertTriangle, PartyPopper } from "lucide-react"
import { v4 as uuidv4 } from 'uuid';
import { useCart, type CartItem } from "@/context/cart-context"
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
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
import { isBefore, startOfToday, parseISO } from 'date-fns';

const ticketFormSchema = z.object({
  eventId: z.string().min(1, "Please link this ticket to an event."),
  package: z.enum(["Standard", "VIP", "VVIP", "Personal"]),
  price: z.coerce.number().min(0, "Price cannot be negative."),
  packageQuantity: z.coerce.number().min(1, "Quantity must be at least 1.").default(1),
  isFree: z.boolean().default(false),
  attendeeName: z.string().optional(),
  guestPhotoUrl: z.string().optional(),
  isPrivate: z.boolean().default(false),
  maxScans: z.number().min(1).default(1),
  ticketImageUrl: z.string().optional(),
  ticketBrandingImageUrl: z.string().optional(),
}).refine(data => {
    if (data.package === 'Personal' && !data.attendeeName) {
        return false;
    }
    return true;
}, {
    message: "Attendee name is required for Personal tickets.",
    path: ["attendeeName"],
});

export type TicketFormValues = z.infer<typeof ticketFormSchema>;

const PLATFORM_PUBLISH_FEE = 1000;

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
      package: 'Standard',
      price: 0,
      packageQuantity: 1,
      isFree: true,
      attendeeName: '',
      guestPhotoUrl: '',
      maxScans: 1,
      isPrivate: false,
      ticketImageUrl: backgroundsData.backgrounds[0].url,
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
  const isFree = form.watch('isFree');
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

  useEffect(() => {
    if (selectedPackage === 'Standard' && isFree) {
        form.setValue('price', 0);
    }
  }, [isFree, selectedPackage, form]);

  const onSubmit = (data: TicketFormValues) => {
    if (!user) return;
    const linkedEvent = vendorEvents?.find(e => e.id === data.eventId);

    const { price, ...rest } = data;

    const cartItem: CartItem = {
      id: uuidv4(),
      ...rest,
      attendeePrice: price,
      price: PLATFORM_PUBLISH_FEE, // The fee per category
      quantity: data.packageQuantity,
      eventName: linkedEvent?.name || 'Standalone Ticket',
    };
    
    addToCart(cartItem);
    setIsSuccessDialogOpen(true);
  };
  
  const handleCraftAnother = () => {
    form.reset({
        ...form.getValues(),
        packageQuantity: 1,
        attendeeName: '',
        guestPhotoUrl: '',
    });
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
    const isVendorApproved = vendorData?.status === 'approved';

    if (hasVendorRole || isVendorApproved) {
        setAuthStatus('authorized');
    } else {
        setAuthStatus('unauthorized');
        toast({ variant: "destructive", title: "Unauthorized", description: "You must be an approved vendor to craft tickets." });
        router.push('/vendor/dashboard');
    }
  }, [isUserLoading, isUserDataLoading, isVendorDataLoading, user, userData, vendorData, router, toast]);

  useEffect(() => {
    if (authStatus === 'authorized' && !areEventsLoading) {
      if (!vendorEvents || vendorEvents.length === 0) {
        setShowNoEventsDialog(true);
      }
    }
  }, [authStatus, areEventsLoading, vendorEvents]);

  const handleFileUpload = async (file: File | null, field: keyof TicketFormValues) => {
    if (!file || !user || !storage) return;

    // Secure Folder & malware protection check: MIME type and Size
    if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File', description: 'Only image files are allowed.' });
        return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB Limit
        toast({ variant: 'destructive', title: 'File Too Large', description: 'Images must be smaller than 5MB.' });
        return;
    }

    setIsUploading(true);
    try {
      // Structure into a secured vendor-specific folder
      const filePath = `public-uploads/ticket-assets/${user.uid}/${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storageRef = ref(storage, filePath);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);
      form.setValue(field, downloadURL, { shouldValidate: true });
      toast({ title: 'Image Uploaded Successfully' });
    } catch (error: any) {
      let description = 'Upload failed.';
      if (error.code === 'storage/retry-limit-exceeded') {
        description = "Storage not enabled or network error. Check Firebase Console.";
      } else if (error.code === 'storage/unauthorized') {
        description = "You do not have permission to upload to this folder.";
      }
      toast({ variant: 'destructive', title: 'Upload Failed', description });
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenCropper = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Quick validation before cropping
    if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File', description: 'Please select an image file.' });
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
    const dataURItoBlob = (dataURI: string): Blob => {
        const byteString = atob(dataURI.split(',')[1]);
        const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) { ia[i] = byteString.charCodeAt(i); }
        return new Blob([ab], {type: mimeString});
    };
    const blob = dataURItoBlob(croppedImageBase64);
    const file = new File([blob], `ticket-bg-${uuidv4()}.png`, { type: 'image/png' });
    await handleFileUpload(file, 'ticketImageUrl');
    setImageToCrop(null);
  };
  
  const handleGenerateImage = async () => {
    if (!user || !storage) return;
    setIsGenerating(true);
    try {
      const dataUri = await generateBackgroundImage("abstract background for an event ticket, vibrant swirls, high resolution");
      const dataURItoBlob = (dataURI: string): Blob => {
          const byteString = atob(dataURI.split(',')[1]);
          const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) { ia[i] = byteString.charCodeAt(i); }
          return new Blob([ab], {type: mimeString});
      };
      const imageBlob = dataURItoBlob(dataUri);
      const file = new File([imageBlob], `ai-${uuidv4()}.png`, { type: 'image/png' });
      await handleFileUpload(file, 'ticketImageUrl');
      toast({ title: "AI Background Generated!" });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Generation Failed' });
    } finally {
      setIsGenerating(false);
    }
  }

  const handleRandomImage = () => {
    const backgrounds = backgroundsData.backgrounds;
    const randomIndex = Math.floor(Math.random() * backgrounds.length);
    form.setValue('ticketImageUrl', backgrounds[randomIndex].url, { shouldValidate: true });
    toast({ title: 'Random Background Applied' });
  };

  if (authStatus !== 'authorized' || areEventsLoading) return <PageSkeleton />;

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
              <AlertDialogDescription>You must have at least one published event to craft a ticket.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
              <Button variant="outline" onClick={() => router.push('/vendor/dashboard')}>Go to Dashboard</Button>
              <Button asChild><Link href="/create-event">Create Event</Link></Button>
          </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <div className="container max-w-6xl mx-auto py-10 px-4">
        <div className="space-y-2 mb-8">
            <h1 className="text-4xl font-bold font-headline">Craft Tickets</h1>
            <p className="text-muted-foreground">Define categories, set custom prices, and design your layout.</p>
        </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid md:grid-cols-2 gap-12">
            <div className="space-y-8">
                <FormField
                  control={form.control}
                  name="eventId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link to Event</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an event..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vendorEvents?.map(event => {
                            const lastDate = event.dates?.[event.dates.length - 1];
                            const isExpired = lastDate?.date && isBefore(new Date(lastDate.date), startOfToday());
                            return (
                                <SelectItem key={event.id} value={event.id} disabled={isExpired}>
                                    <div className="flex items-center justify-between w-full">
                                      <span>{event.name}</span>
                                      {isExpired && <Badge variant="destructive" className="ml-2">Expired</Badge>}
                                    </div>
                                </SelectItem>
                            )
                          })}
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
                        <AlertDescription>You cannot craft new tickets for a past event.</AlertDescription>
                    </Alert>
                )}

                <FormField
                  control={form.control}
                  name="package"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Ticket Category</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4">
                          {["Standard", "VIP", "VVIP", "Personal"].map((cat) => (
                             <FormItem key={cat}>
                                <RadioGroupItem value={cat} id={cat} className="sr-only peer" />
                                <Label htmlFor={cat} className="flex h-full flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:shadow-md relative cursor-pointer">
                                  <div className="absolute top-2 right-2 hidden h-5 w-5 items-center justify-center rounded-full bg-primary text-white peer-data-[state=checked]:flex">
                                      <Check className="h-3 w-3" />
                                  </div>
                                  <span className="font-semibold text-center">{cat}</span>
                                </Label>
                              </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Card>
                    <CardHeader>
                        <CardTitle>Pricing & Quantity</CardTitle>
                        <CardDescription>Set the cost for attendees and the quantity for this category batch.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ticket Price (₦)</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} disabled={selectedPackage === 'Standard' && isFree} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="packageQuantity"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Quantity</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                        {selectedPackage === 'Standard' && (
                            <FormField
                                control={form.control}
                                name="isFree"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                        <div className="space-y-0.5"><FormLabel>Mark as Free</FormLabel></div>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )}
                            />
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Ticket Design</CardTitle>
                        <CardDescription>Select or upload a custom background.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField
                            control={form.control}
                            name="ticketImageUrl"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Background Gallery</FormLabel>
                                <FormControl>
                                    <div>
                                        <RadioGroup onValueChange={field.onChange} value={field.value || ''} className="grid grid-cols-4 gap-2 pt-2">
                                        {backgroundsData.backgrounds.map((bg) => (
                                            <FormItem key={bg.id}>
                                            <FormControl><RadioGroupItem value={bg.url} id={bg.id} className="sr-only" /></FormControl>
                                            <Label htmlFor={bg.id} className="block aspect-[2/3] w-full rounded-md border-2 border-transparent bg-popover hover:border-primary peer-data-[state=checked]:border-primary cursor-pointer overflow-hidden relative group">
                                                <Image src={bg.url} alt={bg.id} fill className="object-cover" />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 peer-data-[state=checked]:opacity-100 transition-opacity"><Check className="h-8 w-8 text-white" /></div>
                                            </Label>
                                            </FormItem>
                                        ))}
                                        </RadioGroup>
                                        <div className="flex gap-2 mt-4">
                                            <Button asChild variant="outline" size="icon" className="cursor-pointer" disabled={isUploading || isGenerating}>
                                                <label htmlFor="bg-upload"><Upload className="h-4 w-4" /><span className="sr-only">Upload</span></label>
                                            </Button>
                                            <Input id="bg-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleOpenCropper} disabled={isUploading || isGenerating} />
                                            <Button variant="outline" size="icon" onClick={handleGenerateImage} disabled={isGenerating || isUploading}>
                                                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin"/> : <Wand2 className="h-4 w-4" />}
                                            </Button>
                                            <Button variant="outline" size="icon" onClick={handleRandomImage} disabled={isGenerating || isUploading}><Shuffle className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                </FormControl>
                            </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {selectedPackage === 'Personal' && (
                    <Card>
                        <CardHeader><CardTitle>Personalization</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="attendeeName"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Attendee Name</FormLabel>
                                    <FormControl><Input {...field} placeholder="Full Name" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="guestPhotoUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Photo (Optional)</FormLabel>
                                        <FormControl>
                                            <div className="flex items-center gap-4">
                                                {form.watch('guestPhotoUrl') && <Image src={form.watch('guestPhotoUrl')!} alt="guest" width={48} height={48} className="rounded-full h-12 w-12 object-cover border" />}
                                                <Button asChild variant="outline" disabled={isUploading}>
                                                    <label htmlFor="guest-photo-upload" className="cursor-pointer"><Upload className="mr-2 h-4 w-4" /> Upload</label>
                                                </Button>
                                                <Input id="guest-photo-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleFileUpload(e.target.files?.[0] || null, 'guestPhotoUrl')} disabled={isUploading} />
                                            </div>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                )}
            </div>
            
            <div className="space-y-8">
                <div className="sticky top-24 space-y-8">
                    <Card>
                        <CardHeader><CardTitle>Live Preview</CardTitle></CardHeader>
                        <CardContent><TicketStylePreview eventData={{...form.watch(), name: selectedEvent?.name }} /></CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Category Batch Fee</CardTitle></CardHeader>
                        <CardContent>
                           <div className="flex justify-between items-center text-lg font-bold">
                                <span>Platform Publishing Fee:</span>
                                <span>₦{PLATFORM_PUBLISH_FEE.toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">Platform fee is charged per ticket category added to your cart.</p>
                        </CardContent>
                    </Card>
                     <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting || isEventExpired || isUploading}>
                        <ShoppingCart className="mr-2 h-5 w-5" /> Add Category to Cart
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
                <AlertDialogTitle className="text-2xl">Batch Added!</AlertDialogTitle>
                <AlertDialogDescription>Your ticket category batch has been added to your cart for publishing.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button variant="outline" onClick={handleCraftAnother}>Add Another Category</Button>
                 <Button onClick={handleViewCart}><ShoppingCart className="mr-2 h-4 w-4" /> Go to Checkout</Button>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
