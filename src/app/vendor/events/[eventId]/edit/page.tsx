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
import { CalendarIcon, ArrowLeft, UserPlus, Trash2, Wand2, PlusCircle, Upload, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton"
import type { Event, User as UserType, EventDate } from "@/lib/types";
import Link from "next/link";
import { useFirebase, useDoc, updateDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { doc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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

  const [newScannerId, setNewScannerId] = useState('');
  
  const eventDocRef = useMemoFirebase(() => {
    if (!firestore || !eventId) return null;
    return doc(firestore, 'events', eventId);
  }, [firestore, eventId]);

  const { data: eventData, isLoading } = useDoc<Event>(eventDocRef);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: "",
      dates: [],
      isOnline: false,
      location: "",
      description: "",
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
    if (!file || !user || !storage) return;

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

  useEffect(() => {
    if (eventData) {
      form.reset({
        name: eventData.name,
        dates: eventData.dates.map(d => ({...d, date: new Date(d.date)})),
        isOnline: !!eventData.isOnline,
        location: eventData.location,
        description: eventData.description || "",
        bannerUrl: eventData.bannerUrl || "",
      });
    }
  }, [eventData, form]);

  const onSubmit = (data: EventFormValues) => {
    if (!eventDocRef) return;
    
    const formattedDates: EventDate[] = data.dates.map(d => ({
      ...d,
      date: d.date.toISOString(),
    }));

    const updateData: Partial<Omit<Event, 'id'>> = {
        name: data.name,
        dates: formattedDates,
        isOnline: data.isOnline,
        location: data.location,
        description: data.description,
        bannerUrl: data.bannerUrl,
    };
    
    updateDocumentNonBlocking(eventDocRef, updateData);
    
    toast({
        title: "Event Updated",
        description: `The event "${data.name}" has been successfully updated.`,
    });
    router.push('/vendor/dashboard');
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
                <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>Save Changes</Button>
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
