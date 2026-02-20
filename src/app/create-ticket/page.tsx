
'use client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useFirebase, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import type { User as UserType, Event as EventType, Ticket } from "@/lib/types";
import { doc, collection, query, where } from "firebase/firestore";
import { useEffect, useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { TicketStylePreview } from "@/components/ticket-style-preview"
import Image from "next/image"
import { generateBackgroundImage } from "@/ai/flows/generate-ticket-image-flow"
import { Loader2, Wand2, Info, Plus, Upload, ShoppingCart, Check, PartyPopper } from "lucide-react"
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

const ticketFormSchema = z.object({
  eventId: z.string().optional(),
  package: z.enum(["Regular", "Premium Individual", "Premium General", "Tiered"]),
  tier: z.string().optional(),
  class: z.string().optional(),
  attendeeName: z.string().optional(),
  guestPhotoUrl: z.string().optional(),
  isPrivate: z.boolean().default(false),
  maxScans: z.number().min(1).default(1),
  
  // Design fields
  templateId: z.string().default('classic'),
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


export default function CreateTicketPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, isUserLoading, firestore, storage } = useFirebase();
  const { addToCart } = useCart();
  
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [lastAddedCartItem, setLastAddedCartItem] = useState<CartItem | null>(null);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserType>(userDocRef);
  
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
      tier: '',
      class: '',
      attendeeName: '',
      guestPhotoUrl: '',
      maxScans: 1,
      isPrivate: false,
      templateId: 'classic',
      ticketImageUrl: '',
      ticketBrandingImageUrl: '',
    },
    mode: "onChange",
  });
  
  const selectedPackage = form.watch('package');
  const selectedTier = form.watch('tier');
  const selectedEventId = form.watch('eventId');

  const selectedEvent = useMemo(() => {
    return vendorEvents?.find(e => e.id === selectedEventId);
  }, [vendorEvents, selectedEventId]);

  const currentPriceDetails = useMemo(() => {
    if (selectedPackage === 'Tiered') {
      if (selectedTier && packages.Tiered[selectedTier as keyof typeof packages.Tiered]) {
        return packages.Tiered[selectedTier as keyof typeof packages.Tiered];
      }
    } else {
      return packages[selectedPackage];
    }
    return { price: 0, tickets: 0 };
  }, [selectedPackage, selectedTier]);

  const onSubmit = (data: TicketFormValues) => {
    if (!user) return;
    const linkedEvent = vendorEvents?.find(e => e.id === data.eventId);

    const cartItem: CartItem = {
      id: uuidv4(),
      ...data,
      eventId: data.eventId || '',
      price: currentPriceDetails.price,
      quantity: currentPriceDetails.tickets,
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
    const isAuthorized = (userData?.roles || []).some(role => ['admin', 'vendor'].includes(role));
    if (isAuthorized) {
        setAuthStatus('authorized');
    } else {
        setAuthStatus('unauthorized');
        toast({ variant: "destructive", title: "Unauthorized", description: "You must be a vendor or admin to craft tickets." });
        router.push('/vendor');
    }
  }, [isUserLoading, isUserDataLoading, user, userData, router, toast]);

  const handleFileUpload = async (file: File, field: keyof TicketFormValues) => {
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
        const filePath = `public-uploads/ticket-assets/${uuidv4()}-${file.name}`;
        const storageRef = ref(storage, filePath);
        
        const uploadResult = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(uploadResult.ref);

        form.setValue(field, downloadURL, { shouldValidate: true });
        toast({ title: 'Image Uploaded', description: 'Your image has been saved.' });
    } catch (error: any) {
        console.error("Upload error:", error);
        toast({ variant: 'destructive', title: 'Upload Failed', description: error.message || 'Could not upload the image.' });
    } finally {
        setIsUploading(false);
    }
  };
  
  const handleGenerateImage = async () => {
    const prompt = "abstract background for an event ticket, aspect ratio 2:3";
    setIsGenerating(true);
    try {
      const imageUrl = await generateBackgroundImage(prompt);
      form.setValue('ticketImageUrl', imageUrl, { shouldValidate: true });
      toast({ title: "AI Background Generated!", description: "A new background image has been applied." });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Generation Failed', description: 'Could not generate an image at this time.' });
    } finally {
      setIsGenerating(false);
    }
  }


  if (authStatus !== 'authorized' || areEventsLoading) {
    return (
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
  }

  const isPremiumPackage = selectedPackage.startsWith('Premium');

  return (
    <>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an event you've created..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vendorEvents && vendorEvents.length > 0 ? vendorEvents.map(event => (
                            <SelectItem 
                                key={event.id} 
                                value={event.id}
                                disabled={!!event.status && event.status !== 'published'}
                            >
                                <div className="flex items-center justify-between w-full">
                                  <span>{event.name}</span>
                                  {!!event.status && event.status !== 'published' && (
                                    <Badge variant="outline" className="ml-2 capitalize">
                                      {event.status}
                                    </Badge>
                                  )}
                                </div>
                            </SelectItem>
                          )) : (
                            <div className="p-4 text-sm text-muted-foreground">No events found. Please <Link href="/create-event" className="underline text-primary">create an event</Link> first.</div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                 {isPremiumPackage && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Premium Design Options</CardTitle>
                            <CardDescription>Select a base design for your premium tickets.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField
                                control={form.control}
                                name="templateId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Choose Ticket Style</FormLabel>
                                        <FormControl>
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                className="grid grid-cols-3 gap-4"
                                            >
                                                {['Classic', 'Modern', 'Minimal'].map((style) => (
                                                <FormItem key={style}>
                                                    <FormControl>
                                                    <RadioGroupItem value={style.toLowerCase()} id={style.toLowerCase()} className="sr-only" />
                                                    </FormControl>
                                                    <Label
                                                        htmlFor={style.toLowerCase()}
                                                        className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                                                    >
                                                        <div className="w-16 h-10 bg-secondary rounded-sm mb-2" />
                                                        <span className="text-sm font-medium">{style}</span>
                                                    </Label>
                                                </FormItem>
                                                ))}
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="ticketImageUrl"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ticket Background</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center gap-4">
                                            {form.watch('ticketImageUrl') && <Image src={form.watch('ticketImageUrl')!} alt="background" width={100} height={60} className="rounded-md h-12 w-20 object-cover" />}
                                            <Button asChild variant="outline">
                                                <label htmlFor="bg-upload" className="cursor-pointer"><Upload className="mr-2 h-4 w-4" /> Upload</label>
                                            </Button>
                                             <Button variant="outline" size="icon" onClick={handleGenerateImage} disabled={isGenerating}>
                                                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin"/> : <Wand2 className="h-4 w-4" />}
                                                <span className="sr-only">Generate with AI</span>
                                            </Button>
                                            <Input id="bg-upload" type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], 'ticketImageUrl')} disabled={isUploading} />
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
                                            <Input id="brand-upload" type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], 'ticketBrandingImageUrl')} disabled={isUploading} />
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
                                                <Input id="guest-photo-upload" type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], 'guestPhotoUrl')} disabled={isUploading} />
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
                                    <p><span className="font-semibold">{currentPriceDetails.tickets} ticket(s)</span> for the <span className="font-semibold">{selectedPackage} {selectedTier || ''}</span> package.</p>
                                </AlertDescription>
                            </Alert>
                            <div className="mt-6 flex justify-between items-center text-lg font-bold">
                                <span>Total Price:</span>
                                <span>₦{currentPriceDetails.price.toLocaleString()}</span>
                            </div>
                        </CardContent>
                    </Card>
                     <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting || currentPriceDetails.price <= 0}>
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
