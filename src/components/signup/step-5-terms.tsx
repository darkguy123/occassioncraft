
'use client';

import { UseFormReturn } from "react-hook-form";
import { SignupSchema } from "@/app/(auth)/signup/page";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";
import { useState, useEffect } from "react";

interface StepProps {
    form: UseFormReturn<SignupSchema>;
}

export function Step5Terms({ form }: StepProps) {
    const [privacyPolicyContent, setPrivacyPolicyContent] = useState('');
    const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);

     useEffect(() => {
        const savedContent = localStorage.getItem('privacyPolicy');
        if (savedContent) {
            setPrivacyPolicyContent(savedContent);
        } else {
            setPrivacyPolicyContent('Privacy Policy content has not been set by an admin yet.')
        }
    }, []);

    const { formState: { errors }, watch, setValue } = form;
    const isStepValid = watch('terms') && !errors.terms;

    const handleAcceptPolicy = () => {
        setValue('terms', true, { shouldValidate: true });
        setIsPolicyDialogOpen(false);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Review and Finish</h2>
            <p className="text-muted-foreground">One last step! Please review and accept our terms.</p>
            <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                    <FormItem className="flex items-start space-x-3 rounded-md border p-4 border-white/20">
                        <FormControl>
                             <Checkbox checked={field.value} onCheckedChange={field.onChange} id="terms"/>
                        </FormControl>
                        <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="terms" className="text-sm font-normal">
                            I agree to the{" "}
                            <Dialog open={isPolicyDialogOpen} onOpenChange={setIsPolicyDialogOpen}>
                                <DialogTrigger asChild>
                                <span className="underline underline-offset-4 hover:text-primary cursor-pointer">
                                    Privacy Policy
                                </span>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[625px]">
                                <DialogHeader>
                                    <DialogTitle>Privacy Policy</DialogTitle>
                                    <DialogDescription>
                                    Our commitment to your privacy.
                                    </DialogDescription>
                                </DialogHeader>
                                <ScrollArea className="h-96 w-full rounded-md border p-4">
                                    <p className="whitespace-pre-wrap text-sm">{privacyPolicyContent || 'Loading...'}</p>
                                </ScrollArea>
                                <DialogFooter>
                                    <Button type="button" onClick={handleAcceptPolicy}>I Accept</Button>
                                </DialogFooter>
                                </DialogContent>
                            </Dialog>
                            </Label>
                            <FormMessage />
                        </div>
                    </FormItem>
                )}
            />
            
            <Button type="submit" className="w-full" disabled={!isStepValid}>
                Create my account
            </Button>
        </div>
    );
}

// We need to import Label here because we removed it from the parent
import { Label } from "@/components/ui/label"
