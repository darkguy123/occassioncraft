
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
import { CalendarIcon, ArrowLeft, Plus, Loader2, UserPlus, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton"
import Image from "next/image"
import type { Event, User as UserType } from "@/lib/types";
import Link from "next/link";
import { useFirebase, useDoc, updateDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { doc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";


const eventFormSchema = z.object({
  name: z.string().min(3, "Event name must be at least 3 characters."),
  date: z.date({ required_error: "An event date is required." }),
  startTime: z.string().min(1, "Start time is required."),
  endTime: z.string().optional(),
  isOnline: z.boolean().default(false),
  location: z.string().min(1, "Location is required"),
  description: z.string().optional(),
  bannerUrl: z.string().optional(),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

export default function VendorEditEventPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, firestore, storage } = useFirebase();
  const params = useParams();
  const eventId = params.eventId as string;

  const [isUploading, setIsUploading] = useState(false);
  const [newScannerId, setNewScannerId] = useState('');
  
  const eventDocRef = useMemoFirebase(() => {
    if (!firestore || !eventId) return null;
    return doc(firestore, 'events', eventId);
  }, [firestore, eventId]);

  const { data: eventData, isLoading } = useDoc<Event>(eventDocRef);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    mode: "onChange",
  });
  
  useEffect(() => {
    if (eventData) {
      const date = new Date(eventData.date);
      if (isNaN(date.getTime())) {
          console.error("Invalid date from Firestore:", eventData.date);
          return;
      }
      form.reset({
        name: eventData.name,
        date: date,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        isOnline: eventData.isOnline,
        location: eventData.location,
        description: eventData.description,
        bannerUrl: eventData.bannerUrl,
      });
    }
  }, [eventData, form]);

  const onSubmit = (data: EventFormValues) => {
    if (!eventDocRef) return;
    
    const updateData: Partial<Event> = {
      ...data,
      date: data.date.toISOString(),
    };

    if (!updateData.endTime) {
      delete updateData.endTime;
    }
    
    updateDocumentNonBlocking(eventDocRef, updateData);
    
    toast({
        title: "Event Updated",
        description: `The event "${data.name}" has been successfully updated.`,
    });
    router.push('/vendor/dashboard');
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !storage) return;

    if (file.size > 4 * 1024 * 1024) { // 4MB limit
        toast({ variant: 'destructive', title: 'File too large', description: 'Image must be smaller than 4MB.' });
        return;
    }

    setIsUploading(true);
    const storageRef = ref(storage, `banners/${user.uid}/${eventId}/${uuidv4()}-${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    uploadTask.on('state_changed',
      (snapshot) => {
        // Progress
      },
      (error) => {
        console.error("Error uploading file:", error);
        toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload the banner image.' });
        setIsUploading(false);
      },
      async () => {
        try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            form.setValue('bannerUrl', downloadURL, { shouldValidate: true });
            toast({ title: 'Banner Uploaded', description: 'Your new banner has been saved.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not get image URL.' });
        } finally {
            setIsUploading(false);
        }
      }
    );
  };

  const handleAddScanner = async () => {
    if (!newScannerId.trim() || !eventDocRef || !firestore) return;
    const scannerUid = newScannerId.trim();

    // 1. Add to event's authorizedScanners array
    updateDocumentNonBlocking(eventDocRef, {
      authorizedScanners: arrayUnion(scannerUid)
    });

    // 2. Add 'scanner' role to the user's document
    const userRef = doc(firestore, 'users', scannerUid);
    try {
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
            const userData = userDoc.data() as UserType;
            const updatedRoles = [...new Set([...(userData.roles || []), 'scanner'])];
            updateDocumentNonBlocking(userRef, { roles: updatedRoles });
        } else {
            toast({ variant: 'destructive', title: 'User Not Found', description: `Could not find a user with ID: ${scannerUid}` });
            // Rollback the change on the event if user doesn't exist
            updateDocumentNonBlocking(eventDocRef, { authorizedScanners: arrayRemove(scannerUid) });
            return;
        }
    } catch (error) {
        console.error("Error adding scanner role:", error);
        updateDocumentNonBlocking(eventDocRef, { authorizedScanners: arrayRemove(scannerUid) });
        toast({ variant: 'destructive', title: 'Error', description: `Failed to update user role.` });
        return;
    }

    toast({ title: "Scanner Added", description: "The user can now scan tickets for this event." });
    setNewScannerId('');
  };

  const handleRemoveScanner = (scannerId: string) => {
    if (!eventDocRef) return;
     // We can leave the 'scanner' role on the user document, as they might be a scanner for another event.
    // Access control is ultimately handled on the /validate page per event.
    updateDocumentNonBlocking(eventDocRef, {
      authorizedScanners: arrayRemove(scannerId)
    });
    toast({ title: "Scanner Removed" });
  };


  if (isLoading) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <Skeleton className="h-10 w-1/4" />
          <div className="space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </div>
    );
  }

  if (!eventData && !isLoading) {
      return (
           <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <h1 className="text-3xl font-bold tracking-tight">Event Not Found</h1>
                <p className="text-muted-foreground">The event you are trying to edit does not exist.</p>
                 <Button asChild>
                    <Link href="/vendor/dashboard">Back to Dashboard</Link>
                </Button>
            </div>
      )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="space-y-2">
            <Button variant="ghost" size="sm" asChild>
                <Link href="/vendor/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Edit Event: {eventData?.name}</h1>
            <p className="text-muted-foreground">Modify the details of the event below.</p>
        </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-2">
                <div className="w-full aspect-[16/7] bg-card rounded-lg border-2 border-dashed flex items-center justify-center relative overflow-hidden">
                    {form.watch('bannerUrl') ? (
                        <Image src={form.watch('bannerUrl')!} alt="Banner preview" layout="fill" objectFit="cover" />
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
                 <Button asChild variant="outline" size="sm">
                    <label htmlFor="banner-upload" className="cursor-pointer">
                        <Plus className="mr-2 h-4 w-4"/> Upload New Banner
                    </label>
                </Button>
                <Input id="banner-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isUploading}/>
            </div>
            
            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Event Name</FormLabel>
                    <FormControl>
                        <Input {...field} placeholder="Event Name" />
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
                    name="startTime"
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
                    name="endTime"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>End Time (Optional)</FormLabel>
                            <FormControl><Input type="time" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
             <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl><Input placeholder="Add a venue or address" {...field} disabled={form.watch('isOnline')} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            
            <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea placeholder="Add a description..." {...field} className="min-h-32" /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />

            <div className="flex justify-end pt-4 border-t">
                <Button type="submit" size="lg" disabled={form.formState.isSubmitting || isUploading}>Save Changes</Button>
            </div>
        </form>
      </Form>

       <Card>
        <CardHeader>
          <CardTitle>Ticket Scanners</CardTitle>
          <CardDescription>Authorize users to scan tickets for this event by adding their User ID.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter User ID to add scanner"
                value={newScannerId}
                onChange={(e) => setNewScannerId(e.target.value)}
              />
              <Button onClick={handleAddScanner}><UserPlus className="mr-2 h-4 w-4" /> Add Scanner</Button>
            </div>
            <div className="space-y-2">
              <Label>Authorized Scanners</Label>
              {eventData?.authorizedScanners && eventData.authorizedScanners.length > 0 ? (
                <ul className="divide-y rounded-md border">
                  {eventData.authorizedScanners.map(id => (
                    <li key={id} className="flex items-center justify-between p-2">
                      <span className="font-mono text-sm">{id}</span>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveScanner(id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No scanners authorized yet.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
