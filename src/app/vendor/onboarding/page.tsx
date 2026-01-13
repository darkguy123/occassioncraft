
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth, useUser, useFirestore, updateDocumentNonBlocking, setDocumentNonBlocking, useFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Building, Check, Eye, EyeOff } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

const step1Schema = z.object({
  companyName: z.string().min(3, { message: 'Company name must be at least 3 characters.' }),
  companyDescription: z.string().optional(),
});

const step2Schema = z.object({
  password: z.string().min(1, { message: 'Password is required to confirm your identity.' }),
});

const onboardingSchema = step1Schema.merge(step2Schema);

type OnboardingSchema = z.infer<typeof onboardingSchema>;

const Step1 = ({ form, onNext }: { form: any, onNext: () => void }) => {
    const { formState: { errors }, trigger, watch } = form;

    const handleNext = async () => {
        const isValid = await trigger(['companyName', 'companyDescription']);
        if (isValid) {
            onNext();
        }
    }
    const companyName = watch('companyName');

    return (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-4">
            <h2 className="text-xl font-bold text-center">Tell Us About Your Business</h2>
            <p className="text-sm text-muted-foreground text-center">This information will be displayed on your event pages.</p>
            <FormField control={form.control} name="companyName" render={({ field }) => (
                <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl><Input placeholder="e.g. EventMakers Inc." {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="companyDescription" render={({ field }) => (
                <FormItem>
                    <FormLabel>Company Description (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="What does your company do?" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            <Button type="button" onClick={handleNext} className="w-full" disabled={!companyName || !!errors.companyName}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </motion.div>
    )
};

const Step2 = ({ form }: { form: any }) => {
    const [showPassword, setShowPassword] = useState(false);
    return (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-4">
            <h2 className="text-xl font-bold text-center">Confirm Your Identity</h2>
            <p className="text-sm text-muted-foreground text-center">For your security, please enter your password to complete the vendor setup.</p>
            <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                    <FormLabel>Password</FormLabel>
                    <div className="relative">
                        <FormControl><Input type={showPassword ? 'text' : 'password'} {...field} /></FormControl>
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                    <FormMessage />
                </FormItem>
            )} />
        </motion.div>
    )
};


export default function VendorOnboardingPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const { user } = useUser();
    const auth = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const form = useForm<OnboardingSchema>({
        resolver: zodResolver(onboardingSchema),
        defaultValues: { companyName: '', companyDescription: '', password: '' },
        mode: 'onChange',
    });

    const onSubmit = async (data: OnboardingSchema) => {
        if (!user || !firestore || !auth?.currentUser) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
            return;
        }

        try {
            // Re-authenticate user
            const credential = EmailAuthProvider.credential(user.email!, data.password);
            await reauthenticateWithCredential(auth.currentUser, credential);

            // Update user role to include 'vendor'
            const userRef = doc(firestore, 'users', user.uid);
            updateDocumentNonBlocking(userRef, {
                roles: ['user', 'vendor']
            });

            // Create vendor document with 'approved' status
            const vendorRef = doc(firestore, 'vendors', user.uid);
            setDocumentNonBlocking(vendorRef, {
                id: user.uid,
                userId: user.uid,
                companyName: data.companyName,
                description: data.companyDescription,
                contactEmail: user.email,
                status: 'approved',
                createdAt: new Date().toISOString(),
                pricingTier: 'Free',
            }, { merge: true });

            toast({
                title: 'Welcome, Vendor!',
                description: "Your account has been upgraded. You're now a vendor.",
            });

            router.push('/vendor/dashboard');

        } catch (error: any) {
            let description = 'An unknown error occurred.';
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                description = 'The password you entered is incorrect. Please try again.';
                form.setError('password', { type: 'manual', message: description });
            } else if (error.code === 'auth/requires-recent-login') {
                description = 'For security, please log out and log back in before becoming a vendor.';
            } else {
                 description = error.message;
            }
            toast({ variant: 'destructive', title: 'Verification Failed', description });
        }
    };

    const handleBack = () => setCurrentStep(prev => prev - 1);
    const steps = [<Step1 form={form} onNext={() => setCurrentStep(1)} />, <Step2 form={form} />];
    const totalSteps = steps.length;
    const progress = ((currentStep + 1) / totalSteps) * 100;

    return (
        <div className="container max-w-2xl mx-auto py-12 px-4 flex items-center min-h-[calc(100vh-8rem)]">
            <Card className="w-full">
                <CardHeader>
                    <Building className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle className="text-center text-2xl font-bold">Become a Vendor</CardTitle>
                    <CardDescription className="text-center">Complete the steps below to start creating and selling events.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Progress value={progress} className="w-full" />
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)}>
                                <AnimatePresence mode="wait">
                                    <motion.div key={currentStep}>
                                        {steps[currentStep]}
                                    </motion.div>
                                </AnimatePresence>

                                <div className="flex gap-4 mt-6">
                                    {currentStep > 0 && (
                                        <Button type="button" variant="outline" onClick={handleBack} className="w-full">
                                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                        </Button>
                                    )}
                                    {currentStep === totalSteps - 1 && (
                                        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                                            <Check className="mr-2 h-4 w-4" /> Complete Setup
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </Form>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
