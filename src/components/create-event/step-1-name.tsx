'use client';

import { UseFormReturn } from "react-hook-form";
import { EventFormValues } from "@/app/create-event/page";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface Step1NameProps {
    form: UseFormReturn<EventFormValues>;
    onNext: () => void;
}

export function Step1Name({ form, onNext }: Step1NameProps) {
    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold font-headline">Let's start with a name</h2>
            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="sr-only">What is the name of your event?</FormLabel>
                        <FormControl>
                            <Input 
                                {...field} 
                                placeholder="e.g. My Awesome Birthday Party" 
                                className="h-14 text-lg" 
                                autoFocus
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <Button 
                type="button" 
                onClick={onNext} 
                className="w-full" 
                size="lg"
                disabled={!form.watch('name') || !!form.formState.errors.name}
            >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
    );
}
