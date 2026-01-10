
'use client';

import { UseFormReturn } from "react-hook-form";
import { SignupSchema } from "@/app/(auth)/signup/page";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface StepProps {
    form: UseFormReturn<SignupSchema>;
    onNext: () => void;
}

export function Step3VendorInfo({ form, onNext }: StepProps) {
     const { formState: { errors }, watch } = form;
     const isStepValid = watch('companyName') && !errors.companyName;

    return (
        <div className="space-y-4">
             <h2 className="text-2xl font-bold text-center">Tell us about your business</h2>
            <div className="grid gap-4">
                 <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. EventMakers Inc." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="companyDescription"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Company Description (Optional)</FormLabel>
                            <FormControl>
                                <Textarea placeholder="What does your company do?" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <Button type="button" onClick={onNext} className="w-full" disabled={!isStepValid}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
    );
}
