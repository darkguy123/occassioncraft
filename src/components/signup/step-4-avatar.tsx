
'use client';

import { UseFormReturn } from "react-hook-form";
import { SignupSchema } from "@/app/(auth)/signup/page";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Upload, Edit } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { ImageCropperDialog } from "@/components/shared/image-cropper-dialog";

interface StepProps {
    form: UseFormReturn<SignupSchema>;
    onNext: () => void;
}

export function Step4Avatar({ form, onNext }: StepProps) {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isCropperOpen, setIsCropperOpen] = useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageSrc(reader.result as string);
                setIsCropperOpen(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const onCrop = (croppedImageUrl: string) => {
        form.setValue('avatarUrl', croppedImageUrl, { shouldValidate: true });
        setIsCropperOpen(false);
    };

    const avatarUrl = form.watch('avatarUrl');
    const fullName = form.watch('fullName');
    const fallback = fullName ? fullName.split(' ').map(n => n[0]).join('') : 'U';

    return (
        <>
            {imageSrc && (
                <ImageCropperDialog
                    isOpen={isCropperOpen}
                    onClose={() => setIsCropperOpen(false)}
                    imageSrc={imageSrc}
                    onCrop={onCrop}
                />
            )}
            <div className="space-y-6 text-center">
                <h2 className="text-2xl font-bold">Add a Profile Picture</h2>

                <div className="flex justify-center">
                    <div className="relative group">
                        <Avatar className="h-32 w-32">
                            <AvatarImage src={avatarUrl} alt="Avatar Preview" />
                            <AvatarFallback className="text-4xl">{fallback}</AvatarFallback>
                        </Avatar>
                        <label htmlFor="avatar-upload" className="absolute inset-0 bg-black/40 flex items-center justify-center text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Edit className="h-8 w-8" />
                        </label>
                    </div>
                </div>

                <FormField
                    control={form.control}
                    name="avatarUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel htmlFor="avatar-upload" className="w-full cursor-pointer">
                                <Button asChild variant="outline">
                                    <div>
                                        <Upload className="mr-2 h-4 w-4" />
                                        {avatarUrl ? 'Change Image' : 'Upload Image'}
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
        </>
    );
}
