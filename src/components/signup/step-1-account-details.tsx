'use client';

import { UseFormReturn } from "react-hook-form";
import { SignupSchema } from "@/app/(auth)/signup/page";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface StepProps {
    form: UseFormReturn<SignupSchema>;
    onNext: () => void;
}

export function Step1AccountDetails({ form, onNext }: StepProps) {
    const { register, formState: { errors }, watch } = form;

    const isStepValid = watch('fullName') && watch('email') && watch('password') && !errors.fullName && !errors.email && !errors.password;

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold">Account Details</h2>
            <div className="grid gap-4">
                 <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Full name</FormLabel>
                            <FormControl>
                                <Input placeholder="Max Robinson" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="m@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <Input type="password" {...field} />
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
