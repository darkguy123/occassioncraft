'use client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { CalendarIcon, PlusCircle, Upload, DollarSign, MapPin, Clock } from "lucide-react"
import { format } from "date-fns"
import { EventPreview } from "@/components/event-preview"
import { useState } from "react"

const eventFormSchema = z.object({
  name: z.string().min(3, "Event name must be at least 3 characters.").max(50, "Event name must be less than 50 characters."),
  description: z.string().min(10, "Description must be at least 10 characters.").max(1000, "Description must be less than 1000 characters."),
  date: z.date({ required_error: "A date is required." }),
  time: z.string().min(1, "Time is required."),
  location: z.string().min(3, "Location is required."),
  category: z.string({ required_error: "Please select a category." }),
  ticketPrice: z.coerce.number().min(0, "Price must be a positive number."),
  bannerUrl: z.string().optional(),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

export default function CreateEventPage() {
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: "My Awesome Event",
      description: "This is a description of my awesome event. It's going to be the best event ever!",
      time: "19:00",
      location: "The Internet",
      ticketPrice: 25,
      category: 'other',
      date: new Date(),
      bannerUrl: 'https://picsum.photos/seed/9/1200/600',
    },
  });

  const [bannerPreview, setBannerPreview] = useState<string | null>(form.getValues('bannerUrl') || null);

  const watchedValues = form.watch();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setBannerPreview(result);
        form.setValue('bannerUrl', result);
      };
      reader.readAsDataURL(file);
    }
  };

  function onSubmit(data: EventFormValues) {
    console.log(data);
    // Here you would typically send the data to your backend
  }

  return (
    <div className="bg-muted/30">
      <div className="container mx-auto grid lg:grid-cols-2 gap-12 py-12 px-4 min-h-[calc(100vh-4rem)]">
        {/* Left Side: Form */}
        <div className="space-y-8">
            <div className="space-y-1">
                <h1 className="text-4xl font-bold font-headline tracking-tighter">Create Event</h1>
                <p className="text-muted-foreground">Fill in the details to create your new event page.</p>
            </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What is the name of your event?</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Summer Music Festival" {...field} className="text-base py-6" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>When is it?</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal h-12", !field.value && "text-muted-foreground")}>
                              {field.value ? (format(field.value, "PPP")) : (<span>Pick a date</span>)}
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
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What time?</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} className="h-12"/>
                      </FormControl>
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
                    <FormLabel>Where is it?</FormLabel>
                     <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Input placeholder="e.g. Madison Square Garden" {...field} className="pl-10 h-12" />
                        </FormControl>
                     </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tell us more about it</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add a description for your event..." className="min-h-[150px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormItem>
                  <FormLabel>Add a banner image</FormLabel>
                  <FormControl>
                    <div className="flex items-center justify-center w-full">
                      <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-secondary/80">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        </div>
                        <input id="dropzone-file" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                      </label>
                    </div>
                  </FormControl>
                </FormItem>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="music">Music</SelectItem>
                            <SelectItem value="arts">Arts & Culture</SelectItem>
                            <SelectItem value="tech">Tech</SelectItem>
                            <SelectItem value="food">Food & Drink</SelectItem>
                            <SelectItem value="sports">Sports</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                />
                <FormField
                  control={form.control}
                  name="ticketPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per Ticket</FormLabel>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Input type="number" placeholder="0.00" className="pl-8 h-12" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" type="button" size="lg">Save Draft</Button>
                <Button type="submit" size="lg">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Publish Event
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Right Side: Preview */}
        <div className="hidden lg:flex items-center justify-center relative">
            <div className="sticky top-24 w-full">
                <p className="text-sm font-semibold text-muted-foreground mb-2 text-center">Live Preview</p>
                <EventPreview eventData={watchedValues} bannerUrl={bannerPreview} />
            </div>
        </div>
      </div>
    </div>
  );
}
