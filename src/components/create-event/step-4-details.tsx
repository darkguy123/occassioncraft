'use client';

import { UseFormReturn } from "react-hook-form";
import { EventFormValues } from "@/app/create-event/page";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, ArrowRight } from "lucide-react";
import React from 'react';

interface Step4DetailsProps {
    form: UseFormReturn<EventFormValues>;
    onNext: () => void;
}

export function Step4Details({ form, onNext }: Step4DetailsProps) {

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                form.setValue('bannerUrl', result, { shouldValidate: true });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold font-headline">Add some details</h2>
            
            <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Tell your attendees what the event is about..." className="min-h-[150px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
            />
            
            <FormItem>
              <FormLabel>Cover Image</FormLabel>
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
               <FormMessage />
            </FormItem>

            <Button 
                type="button" 
                onClick={onNext} 
                className="w-full" 
                size="lg"
                 disabled={!form.watch('description')}
            >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
    );
}
