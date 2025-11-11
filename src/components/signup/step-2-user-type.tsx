'use client';

import { UseFormReturn } from "react-hook-form";
import { SignupSchema } from "@/app/(auth)/signup/page";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ArrowRight, User, Building } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface StepProps {
    form: UseFormReturn<SignupSchema>;
    onNext: () => void;
}

export function Step2UserType({ form, onNext }: StepProps) {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">How will you use our platform?</h2>
             <FormField
                control={form.control}
                name="userType"
                render={({ field }) => (
                    <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-1 gap-4"
                    >
                        <FormItem>
                            <FormControl>
                                <Label className={cn(
                                    "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                     field.value === 'User' && "border-primary"
                                )}>
                                    <RadioGroupItem value="User" className="sr-only" />
                                    <User className="mb-3 h-8 w-8" />
                                    <span className="font-bold">I'm a User</span>
                                    <span className="text-sm text-muted-foreground">To discover and attend events.</span>
                                </Label>
                            </FormControl>
                        </FormItem>
                        <FormItem>
                           <FormControl>
                                <Label className={cn(
                                    "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                    field.value === 'Vendor' && "border-primary"
                                )}>
                                    <RadioGroupItem value="Vendor" className="sr-only" />
                                    <Building className="mb-3 h-8 w-8" />
                                     <span className="font-bold">I'm a Vendor</span>
                                    <span className="text-sm text-muted-foreground">To create and manage events.</span>
                                </Label>
                            </FormControl>
                        </FormItem>
                    </RadioGroup>
                )}
            />

            <Button type="button" onClick={onNext} className="w-full">
                Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
    );
}

// Ensure Label is imported from "@/components/ui/label"
import { Label } from "@/components/ui/label"
