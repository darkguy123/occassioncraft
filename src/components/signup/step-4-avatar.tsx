'use client';

import { UseFormReturn } from "react-hook-form";
import { SignupSchema } from "@/app/(auth)/signup/page";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface StepProps {
    form: UseFormReturn<SignupSchema>;
    onNext: () => void;
}

export function Step4Avatar({ form, onNext }: StepProps) {
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                form.setValue('avatarUrl', result, { shouldValidate: true });
            };
            reader.readAsDataURL(file);
        }
    };
    
    const avatarUrl = form.watch('avatarUrl');
    const fullName = form.watch('fullName');
    const fallback = fullName ? fullName.split(' ').map(n => n[0]).join('') : 'U';

    return (
        <div className="space-y-6 text-center">
            <h2 className="text-2xl font-bold">Add a Profile Picture</h2>
            
            <div className="flex justify-center">
                <Avatar className="h-32 w-32">
                    <AvatarImage src={avatarUrl} alt="Avatar Preview" />
                    <AvatarFallback className="text-4xl">{fallback}</AvatarFallback>
                </Avatar>
            </div>
            
            <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel htmlFor="avatar-upload" className="w-full cursor-pointer">
                             <Button asChild variant="outline">
                                <div>
                                    <Upload className="mr-2 h-4 w-4"/>
                                    Upload Image
                                </div>
                            </Button>
                        </FormLabel>
                        <FormControl>
                            <Input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            
            <Button type="button" onClick={onNext} className="w-full">
                Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
    );
}
