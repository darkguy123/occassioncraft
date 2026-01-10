
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";

interface StepProps {
    form: UseFormReturn<SignupSchema>;
}

export function Step5Terms({ form }: StepProps) {
    const [privacyPolicyContent, setPrivacyPolicyContent] = useState('');
    const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);

     useEffect(() => {
        // In a real app, this would be fetched from a CMS or a static file
        const savedContent = "This is a placeholder for your privacy policy. In a real application, you would fetch this content from a database or a markdown file. You can manage this content from the Admin Panel under Settings > Content.";
        setPrivacyPolicyContent(savedContent);
    }, []);

    const { formState: { errors, isSubmitting }, watch, setValue } = form;
    const isStepValid = watch('terms') && !errors.terms;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center">Review and Finish</h2>
            <p className="text-muted-foreground text-center">One last step! Please review and accept our terms.</p>
            <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                    <FormItem className="flex items-start space-x-3 rounded-md border p-4">
                        <FormControl>
                             <Checkbox checked={field.value} onCheckedChange={field.onChange} id="terms"/>
                        </FormControl>
                        <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="terms" className="text-sm font-normal">
                            I agree to the{" "}
                            <Dialog open={isPolicyDialogOpen} onOpenChange={setIsPolicyDialogOpen}>
                                <DialogTrigger asChild>
                                <span className="underline underline-offset-4 hover:text-primary cursor-pointer">
                                    Terms & Privacy Policy
                                </span>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[625px]">
                                <DialogHeader>
                                    <DialogTitle>Terms & Privacy Policy</DialogTitle>
                                    <DialogDescription>
                                    Our commitment to your privacy and terms of service.
                                    </DialogDescription>
                                </DialogHeader>
                                <ScrollArea className="h-96 w-full rounded-md border p-4">
                                    <p className="whitespace-pre-wrap text-sm">{privacyPolicyContent || 'Loading...'}</p>
                                </ScrollArea>
                                </DialogContent>
                            </Dialog>
                            </Label>
                            <FormMessage />
                        </div>
                    </FormItem>
                )}
            />
            
            <Button type="submit" className="w-full" disabled={!isStepValid || isSubmitting}>
                { isSubmitting ? "Creating Account..." : "Create my account" }
            </Button>
        </div>
    );
}
