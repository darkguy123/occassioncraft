
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
import { CalendarIcon, Clock, DollarSign, Globe, Image as ImageIcon, MapPin, Plus, Video, Sparkles, Trash2, Ticket } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import type { User as UserType } from "@/lib/types";
import { doc } from "firebase/firestore";
import { useEffect, useState }from "react";
import { Skeleton } from "@/components/ui/skeleton"
import Image from "next/image"


const ticketSchema = z.object({
  name: z.string().min(1, "Ticket name is required."),
  price: z.coerce.number().min(0, "Price must be non-negative."),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
});

const eventFormSchema = z.object({
  name: z.string().min(3, "Event name must be at least 3 characters."),
  date: z.date({ required_error: "An event date is required." }),
  startTime: z.string().min(1, "Start time is required."),
  endTime: z.string().optional(),
  isOnline: z.boolean().default(false),
  location: z.string().optional(),
  description: z.string().optional(),
  bannerUrl: z.string().optional(),
  tickets: z.array(ticketSchema).min(1, "At least one ticket type is required."),
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

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: "",
      date: new Date(),
      startTime: format(new Date(), "HH:mm"),
      isOnline: false,
      location: "",
      description: "",
      bannerUrl: "",
      tickets: [{ name: "General Admission", price: 0, quantity: 100 }],
    },
    mode: "onChange",
  });
  
  const { fields, append, remove } = require("react-hook-form").useFieldArray({
      control: form.control,
      name: "tickets",
  });

  const isOnline = form.watch('isOnline');

  const onSubmit = (data: EventFormValues) => {
    console.log(data);
    toast({
        title: "Event Created (Simulated)",
        description: "Your event has been successfully created. In a real app, it would be saved to the database.",
    });
    const isAdmin = (userData?.roles || []).includes('admin');
    router.push(isAdmin ? '/admin/events' : '/vendor/dashboard');
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        if (file.size > 4 * 1024 * 1024) { // 4MB limit
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

  const isLoading = isUserLoading || isUserDataLoading;
  const isAuthorized = (userData?.roles || []).includes('admin') || (userData?.roles || []).includes('vendor');

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!isAuthorized) {
        toast({
            variant: "destructive",
            title: "Unauthorized",
            description: "You must be a vendor or admin to create an event.",
        });
        router.push('/dashboard');
    }
  }, [isLoading, user, isAuthorized, router, toast]);

  if (isLoading || !isAuthorized) {
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl mx-auto py-10 px-4 space-y-8">
            {/* Banner Section */}
            <div className="space-y-2">
                <div className="w-full aspect-[16/7] bg-card rounded-lg border-2 border-dashed flex items-center justify-center relative overflow-hidden">
                    {form.watch('bannerUrl') ? (
                        <Image src={form.watch('bannerUrl')!} alt="Banner preview" layout="fill" objectFit="cover" />
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
                <Input id="banner-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange}/>
            </div>
            
            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                <FormItem>
                    <FormControl>
                    <Input {...field} placeholder="Event Name" className="text-3xl font-bold h-auto py-2 border-0 shadow-none px-0 focus-visible:ring-0" />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />

            {/* Date and Time Section */}
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

            {/* Location Section */}
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
                                <FormControl><Input placeholder="Add a venue or address" {...field} className="h-12" /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    )}
                 </div>
            </div>
            
            {/* Description Section */}
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

            {/* Tickets Section */}
             <div className="flex items-start gap-4">
                 <Ticket className="h-6 w-6 text-muted-foreground mt-2"/>
                 <div className="grid gap-4 flex-grow">
                    <h3 className="font-semibold">Registration</h3>
                     {fields.map((item, index) => (
                        <div key={item.id} className="p-4 rounded-lg border bg-card grid grid-cols-1 sm:grid-cols-3 gap-4 relative">
                            <FormField
                                control={form.control}
                                name={`tickets.${index}.name`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Ticket Name</FormLabel>
                                        <FormControl><Input {...field} placeholder="e.g. General Admission" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`tickets.${index}.price`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Price</FormLabel>
                                         <div className="relative">
                                            <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <FormControl><Input type="number" {...field} className="pl-8" /></FormControl>
                                         </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name={`tickets.${index}.quantity`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quantity</FormLabel>
                                        <FormControl><Input type="number" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {fields.length > 1 && (
                                <Button type="button" variant="ghost" size="icon" className="absolute -top-2 -right-2 h-7 w-7" onClick={() => remove(index)}>
                                    <Trash2 className="h-4 w-4 text-destructive"/>
                                </Button>
                            )}
                        </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => append({ name: "", price: 0, quantity: 100 })}>
                        <Plus className="mr-2 h-4 w-4" /> Add Ticket
                    </Button>
                    <FormMessage>{form.formState.errors.tickets?.root?.message}</FormMessage>
                 </div>
            </div>


            {/* Footer */}
            <div className="flex justify-end pt-4 border-t">
                <Button type="submit" size="lg">Publish Event</Button>
            </div>
        </form>
      </Form>
    </div>
  );
}

    