
'use client';

import { UseFormReturn } from "react-hook-form";
import { SignupSchema } from "@/app/(auth)/signup/page";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ArrowRight, User, Building } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface StepProps {
    form: UseFormReturn<SignupSchema>;
    onNext: () => void;
}

export function Step2UserType({ form, onNext }: StepProps) {
    const roles = form.watch('roles') || [];
    
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">How will you use our platform?</h2>
             <FormField
                control={form.control}
                name="roles"
                render={() => (
                    <div className="grid grid-cols-1 gap-4">
                        <FormField
                            control={form.control}
                            name="roles"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Label className={cn(
                                            "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                            field.value?.includes('user') && "border-primary"
                                        )}>
                                            <Checkbox
                                                checked={field.value?.includes('user')}
                                                className="sr-only"
                                                onCheckedChange={(checked) => {
                                                    const currentRoles = field.value || [];
                                                    const newRoles = checked
                                                        ? [...currentRoles, 'user']
                                                        : currentRoles.filter((role) => role !== 'user');
                                                    return field.onChange(Array.from(new Set(newRoles)));
                                                }}
                                            />
                                            <User className="mb-3 h-8 w-8" />
                                            <span className="font-bold">I'm a User</span>
                                            <span className="text-sm text-muted-foreground">To discover and attend events.</span>
                                        </Label>
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="roles"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Label className={cn(
                                            "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                            field.value?.includes('vendor') && "border-primary"
                                        )}>
                                            <Checkbox
                                                checked={field.value?.includes('vendor')}
                                                className="sr-only"
                                                onCheckedChange={(checked) => {
                                                    const currentRoles = field.value || [];
                                                    const newRoles = checked
                                                        ? [...currentRoles, 'vendor']
                                                        : currentRoles.filter((role) => role !== 'vendor');
                                                    return field.onChange(Array.from(new Set(newRoles)));
                                                }}
                                            />
                                            <Building className="mb-3 h-8 w-8" />
                                            <span className="font-bold">I'm a Vendor</span>
                                            <span className="text-sm text-muted-foreground">To create and manage events.</span>
                                        </Label>
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                         <FormMessage />
                    </div>
                )}
            />

            <Button type="button" onClick={onNext} className="w-full" disabled={roles.length === 0}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
    );
}

// Ensure Label is imported from "@/components/ui/label"
import { Label } from "@/components/ui/label"
