
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
import { CalendarIcon, Image as ImageIcon, MapPin, Plus, Save, PartyPopper, Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useFirebase, useDoc, useMemoFirebase, addDocumentNonBlocking } from "@/firebase";
import type { User as UserType, Event as EventType } from "@/lib/types";
import { doc, collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton"
import Image from "next/image"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import Link from "next/link"
import { v4 as uuidv4 } from 'uuid';
import { ImageCropperDialog } from "@/components/shared/image-cropper-dialog";

const eventFormSchema = z.object({
  name: z.string().min(3, "Event name must be at least 3 characters."),
  date: z.date({ required_error: "An event date is required." }),
  startTime: z.string().min(1, "Start time is required."),
  endTime: z.string().optional(),
  isOnline: z.boolean().default(false),
  location: z.string().optional(),
  description: z.string().optional(),
  bannerUrl: z.string().optional(),
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
  const [isUploading, setIsUploading] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);

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
      endTime: "",
      isOnline: false,
      location: "",
      description: "",
      isPrivate: false,
    },
    mode: "onChange",
  });
  
  const onSubmit = async (data: EventFormValues) => {
     if (!user || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Authentication or database error.' });
        return;
    }
    const eventCollectionRef = collection(firestore, 'events');

    const eventData: Omit<EventType, 'id'> = {
        ...data,
        date: data.date.toISOString(),
        location: data.isOnline ? 'Online Event' : data.location || '',
        vendorId: user.uid,
        organizer: user.displayName || 'Unnamed Organizer',
        status: 'published',
    };
    
    if (!eventData.endTime) {
      delete eventData.endTime;
    }

    try {
        const docRef = await addDoc(eventCollectionRef, eventData);
        setCreatedEvent({ id: docRef.id, ...eventData });
        setIsSuccessDialogOpen(true);
        toast({
            title: "Event Published!",
            description: "Your event is now live.",
        });
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
    const isLoading = isUserLoading || isUserDataLoading;
    if (isLoading) {
      setAuthStatus('loading');
      return;
    }

    if (!user) {
      router.push('/login?redirect=/create-event');
      setAuthStatus('unauthorized');
      return;
    }
    
    const isAuthorized = (userData?.roles || []).some(role => ['admin', 'vendor'].includes(role));
    
    if (isAuthorized) {
        setAuthStatus('authorized');
    } else {
        router.push('/vendor/dashboard'); // Redirect to dashboard which shows pending status
        setAuthStatus('unauthorized');
    }
  }, [isUserLoading, isUserDataLoading, user, userData, router]);

   const onCrop = async (croppedImageBase64: string) => {
    setIsCropperOpen(false);
    if (!user || !storage) return;

    setIsUploading(true);
    try {
        const blob = await fetch(croppedImageBase64).then(res => res.blob());
        const storageRef = ref(storage, `public-uploads/banners/${uuidv4()}-banner.png`);
        
        const uploadResult = await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(uploadResult.ref);

        form.setValue('bannerUrl', downloadURL, { shouldValidate: true });
        toast({ title: 'Banner Uploaded', description: 'Your new banner has been saved.' });

    } catch (error: any) {
        console.error("Error uploading file:", error);
        toast({ variant: 'destructive', title: 'Upload Failed', description: error.message || 'Could not upload the banner image.' });
    } finally {
        setIsUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) { // 4MB limit
        toast({ variant: 'destructive', title: 'File too large', description: 'Image must be smaller than 4MB.' });
        return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
        setImageSrc(reader.result as string);
        setIsCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };
  
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

  return (
    <>
    {imageSrc && (
        <ImageCropperDialog
            isOpen={isCropperOpen}
            onClose={() => setIsCropperOpen(false)}
            imageSrc={imageSrc}
            onCrop={onCrop}
            aspectRatio={16 / 7}
        />
    )}
    <div className="container max-w-2xl mx-auto py-10 px-4">
        <div className="space-y-2 mb-8">
            <h1 className="text-4xl font-bold font-headline">Create a New Event</h1>
            <p className="text-muted-foreground">First, create the event shell. You can add an optional banner image now or later.</p>
        </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-2">
                <FormLabel>Event Banner (Optional)</FormLabel>
                <FormControl>
                  <div className="w-full aspect-[16/7] bg-card rounded-lg border-2 border-dashed flex items-center justify-center relative overflow-hidden">
                      {form.watch('bannerUrl') ? (
                          <Image src={form.watch('bannerUrl')!} alt="Banner" fill className="object-cover" />
                      ) : (
                          <div className="text-center text-muted-foreground">
                              <span className="text-5xl font-bold">
                                {form.watch('name') ? form.watch('name').charAt(0).toUpperCase() : '?'}
                              </span>
                              <p className="mt-2 text-sm font-semibold">No banner uploaded</p>
                          </div>
                      )}
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 text-white animate-spin" />
                        </div>
                      )}
                  </div>
                </FormControl>
                <Button asChild variant="outline" size="sm">
                    <label htmlFor="banner-upload" className="cursor-pointer w-full">
                        <Plus className="mr-2 h-4 w-4"/> Upload Banner
                    </label>
                </Button>
                <Input id="banner-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isUploading} />
            </div>

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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

            <div className="flex justify-end pt-4 border-t">
                <Button type="submit" size="lg" disabled={form.formState.isSubmitting || isUploading}>
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
                <AlertDialogTitle className="text-2xl">Event Published!</AlertDialogTitle>
                <AlertDialogDescription>
                    Your event has been successfully created and is now live. You can now craft tickets for it.
                </AlertDialogDescription>
            </AlertDialogHeader>
            
            {createdEvent && (
                <div className="my-4 rounded-lg border bg-secondary/50 p-4 space-y-2 text-sm">
                    <h4 className="font-semibold">{createdEvent.name}</h4>
                    <div className="flex items-center text-muted-foreground">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        <span>{format(new Date(createdEvent.date), 'PPP')}</span>
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
                        Craft Ticket for Event
                    </Link>
                </Button>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

    