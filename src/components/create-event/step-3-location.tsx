'use client';

import { UseFormReturn } from "react-hook-form";
import { EventFormValues } from "@/app/create-event/page";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowRight } from "lucide-react";

interface Step3LocationProps {
    form: UseFormReturn<EventFormValues>;
    onNext: () => void;
}

export function Step3Location({ form, onNext }: Step3LocationProps) {
    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold font-headline">Where is it taking place?</h2>
            <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Where is it?</FormLabel>
                     <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <FormControl>
                          <Input placeholder="Search for a location or address" {...field} className="pl-12 h-14 text-lg" />
                        </FormControl>
                     </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <Button 
                type="button" 
                onClick={onNext} 
                className="w-full" 
                size="lg"
                disabled={!form.watch('location') || !!form.formState.errors.location}
            >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
    );
}
