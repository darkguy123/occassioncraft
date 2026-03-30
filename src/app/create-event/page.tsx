'use client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon, MapPin, Save, PartyPopper, PlusCircle, Trash2, Upload, Loader2, Image as ImageIcon } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import type { User as UserType, Vendor as VendorType, Event as EventType, EventDate } from "@/lib/types";
import { doc, collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";

const eventDateSchema = z.object({
  date: z.date({ required_error: "A date is required." }),
  startTime: z.string().min(1, "Start time is required."),
  endTime: z.string().optional(),
});

const eventFormSchema = z.object({
  name: z.string().min(3, "Event name must be at least 3 characters."),
  dates: z.array(eventDateSchema).min(1, "At least one date is required."),
  isOnline: z.boolean().default(false),
  location: z.string().optional(),
  description: z.string().optional(),
  isPrivate: z.boolean().default(false),
}).refine(data => !data.isOnline ? !!data.location : true, {
    message: "Location is required for physical events.",
    path: ["location"],
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

export default function CreateEventPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, isUserLoading, firestore, storage } = useFirebase();
  
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [createdEvent, setCreatedEvent] = useState<EventType | null>(null);

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
  
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: "",
      dates: [{ date: new Date(), startTime: format(new Date(), "HH:mm"), endTime: "" }],
      isOnline: false,
      location: "",
      description: "",
      isPrivate: false,
      bannerUrl: "",
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "dates",
  });

  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (file: File | null) => {
    if (!file || !user || !firestore) return;

    if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File', description: 'Only image files are allowed.' });
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        toast({ variant: 'destructive', title: 'File Too Large', description: 'Images must be smaller than 5MB.' });
        return;
    }

    setIsUploading(true);
    try {
      const filePath = `public-uploads/event-banners/${user.uid}/${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storageRef = ref(storage, filePath);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);
      form.setValue('bannerUrl', downloadURL, { shouldValidate: true, shouldDirty: true });
      toast({ title: 'Banner Uploaded Successfully' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: error.message || 'Upload failed.' });
    } finally {
      setIsUploading(false);
    }
  };
  const onSubmit = async (data: EventFormValues) => {
     if (!user || !firestore || !userData) {
        toast({ variant: 'destructive', title: 'Error', description: 'Authentication or database error.' });
        return;
    }
    
    try {
        const eventCollectionRef = collection(firestore, 'events');
        
        const bannerUrl = data.bannerUrl || '';
        const eventStatus = 'published';

        const formattedDates: EventDate[] = data.dates.map(d => ({
          ...d,
          date: d.date.toISOString(),
        }));

        const eventData: Omit<EventType, 'id'> = {
            name: data.name,
            dates: formattedDates,
            isOnline: data.isOnline,
            location: data.isOnline ? 'Online Event' : data.location || '',
            description: data.description,
            isPrivate: data.isPrivate,
            vendorId: user.uid,
            organizer: user.displayName || 'Unnamed Organizer',
            status: eventStatus,
            bannerUrl: bannerUrl,
        };

        const docRef = await addDoc(eventCollectionRef, eventData);
        setCreatedEvent({ id: docRef.id, ...eventData });
        
        toast({
            title: "Event Published!",
            description: "Your event has been successfully created and is now live.",
        });

        setIsSuccessDialogOpen(true);

    } catch (error: any) {
        console.error("Error creating event: ", error);
        toast({
            variant: "destructive",
            title: "Event Creation Failed",
            description: error.message,
        });
    }
  }

  useEffect(() => {
    const isLoading = isUserLoading || isUserDataLoading || isVendorDataLoading;
    if (isLoading) {
      setAuthStatus('loading');
      return;
    }

    if (!user) {
      router.push('/login?redirect=/create-event');
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
        toast({
            variant: "destructive",
            title: "Access Denied",
            description: "You must be an approved vendor to create an event."
        });
        router.push('/vendor/dashboard'); // Redirect to dashboard which shows pending status
        setAuthStatus('unauthorized');
    }
  }, [isUserLoading, isUserDataLoading, isVendorDataLoading, user, userData, vendorData, router, toast]);
  
  const handleCreateAnother = () => {
      form.reset();
      setCreatedEvent(null);
      setIsSuccessDialogOpen(false);
  }

  if (authStatus !== 'authorized') {
    return (
        <div className="container max-w-2xl mx-auto py-10 px-4">
          <div className="space-y-2 mb-8">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </div>
    );
  }

  const successTitle = "Event Published!";
  const successDescription = "Your event has been successfully created and is now live. You can now craft tickets for it.";

  return (
    <>
    <div className="container max-w-2xl mx-auto py-10 px-4">
        <div className="space-y-2 mb-8">
            <h1 className="text-4xl font-bold font-headline">Create a New Event</h1>
            <p className="text-muted-foreground">Fill in the details below to create your event shell.</p>
        </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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

            <div className="space-y-4">
                <FormLabel>Event Dates & Times</FormLabel>
                {fields.map((field, index) => (
                    <Card key={field.id} className="p-4 relative bg-card/50">
                        {fields.length > 1 && (
                            <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                                <span className="sr-only">Remove Date</span>
                            </Button>
                        )}
                        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-0 pt-2">
                             <FormField
                                control={form.control}
                                name={`dates.${index}.date`}
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
                                name={`dates.${index}.startTime`}
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
                                name={`dates.${index}.endTime`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>End Time (Optional)</FormLabel>
                                        <FormControl><Input type="time" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                ))}
                 <Button type="button" variant="outline" size="sm" onClick={() => append({ date: new Date(), startTime: '19:00', endTime: '' })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Another Date
                </Button>
            </div>


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

            {!form.watch('isOnline') && (
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <div className="relative">
                           <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                           <Input placeholder="Add a venue or address" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="isPrivate"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-card">
                  <div className="space-y-0.5">
                    <FormLabel>Private Event</FormLabel>
                    <p className="text-xs text-muted-foreground">If checked, this event will not be listed publicly.</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
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
                    <Textarea placeholder="Add a description..." {...field} className="min-h-32" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Card>
              <CardHeader>
                <CardTitle>Event Banner</CardTitle>
                <CardDescription>Upload a banner for your event.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {form.watch('bannerUrl') ? (
                  <Image src={form.watch('bannerUrl')!} alt="Event banner preview" width={600} height={400} className="rounded-md w-full aspect-[3/2] object-cover" />
                ) : (
                  <div className="w-full aspect-[3/2] bg-secondary rounded-md flex items-center justify-center border-2 border-dashed">
                    <p className="text-muted-foreground">No banner uploaded.</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button asChild variant="outline" disabled={isUploading}>
                      <label className="cursor-pointer">
                          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                          {form.watch('bannerUrl') ? 'Replace Banner' : 'Upload Banner'}
                          <input type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleFileUpload(e.target.files?.[0] || null)} disabled={isUploading} />
                      </label>
                  </Button>
                  {form.watch('bannerUrl') && (
                      <Button type="button" variant="ghost" className="text-destructive" onClick={() => form.setValue('bannerUrl', '', { shouldDirty: true })} disabled={isUploading}>
                          <Trash2 className="h-4 w-4" />
                      </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end pt-4 border-t">
                <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Saving...' : <><Save className="mr-2 h-4 w-4" /> Save Event</>}
                </Button>
            </div>
        </form>
      </Form>
    </div>

    <AlertDialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader className="text-center items-center">
                <PartyPopper className="h-12 w-12 text-primary" />
                <AlertDialogTitle className="text-2xl">{successTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                    {successDescription}
                </AlertDialogDescription>
            </AlertDialogHeader>
            
            {createdEvent && createdEvent.dates.length > 0 && (
                <div className="my-4 rounded-lg border bg-secondary/50 p-4 space-y-2 text-sm">
                    <h4 className="font-semibold">{createdEvent.name}</h4>
                    <div className="flex items-center text-muted-foreground">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        <span>{format(new Date(createdEvent.dates[0].date), 'PPP')}</span>
                    </div>
                     <div className="flex items-center text-muted-foreground">
                        <MapPin className="mr-2 h-4 w-4" />
                        <span>{createdEvent.location}</span>
                    </div>
                </div>
            )}

            <AlertDialogFooter className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button variant="outline" onClick={handleCreateAnother}>
                    Create Another Event
                </Button>
                 <Button asChild>
                    <Link href={`/create-ticket?eventId=${createdEvent?.id}`}>
                        Add ticket
                    </Link>
                </Button>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
