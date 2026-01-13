
'use client';

import { useState } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth, useUser, useFirestore, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Building, Check, Eye, EyeOff } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const step1Schema = z.object({
  companyName: z.string().min(3, { message: 'Company name must be at least 3 characters.' }),
  companyDescription: z.string().optional(),
});

const step2Schema = z.object({
  password: z.string().min(1, { message: 'Password is required to confirm your identity.' }),
});

const applicationSchema = step1Schema.merge(step2Schema);

type ApplicationSchema = z.infer<typeof applicationSchema>;

// Step 1 Component
const Step1 = ({ form, onNext }: { form: UseFormReturn<ApplicationSchema>, onNext: () => void }) => {
    const { formState: { errors }, watch } = form;
    const companyName = watch('companyName');
    return (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-4">
            <div className="space-y-1">
                <h3 className="text-lg font-semibold">Tell Us About Your Business</h3>
                <p className="text-sm text-muted-foreground">This information will be displayed on your event pages.</p>
            </div>
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
            <Button type="button" onClick={onNext} className="w-full" disabled={!companyName || !!errors.companyName}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </motion.div>
    );
};

// Step 2 Component
const Step2 = ({ form }: { form: any }) => {
    const [showPassword, setShowPassword] = useState(false);
    return (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-4">
            <div className="space-y-1">
                <h3 className="text-lg font-semibold">Confirm Your Identity</h3>
                <p className="text-sm text-muted-foreground">For security, please enter your password to complete the vendor setup.</p>
            </div>
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
    );
};

// Main Dialog Component
export function VendorApplicationDialog({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const [currentStep, setCurrentStep] = useState(0);
    const { user } = useUser();
    const auth = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const form = useForm<ApplicationSchema>({
        resolver: zodResolver(applicationSchema),
        defaultValues: { companyName: '', companyDescription: '', password: '' },
        mode: 'onChange',
    });

    const handleNext = async () => {
        const isValid = await form.trigger(['companyName', 'companyDescription']);
        if (isValid) {
            setCurrentStep(1);
        }
    };

    const onSubmit = async (data: ApplicationSchema) => {
        if (!user || !firestore || !auth?.currentUser) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
            return;
        }

        try {
            const credential = EmailAuthProvider.credential(user.email!, data.password);
            await reauthenticateWithCredential(auth.currentUser, credential);

            const userRef = doc(firestore, 'users', user.uid);
            updateDocumentNonBlocking(userRef, { roles: ['user', 'vendor'] });

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

            toast({ title: 'Welcome, Vendor!', description: "Your account has been upgraded." });
            onOpenChange(false);
            router.push('/vendor/dashboard');

        } catch (error: any) {
            let description = 'An unknown error occurred.';
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                description = 'The password you entered is incorrect. Please try again.';
                form.setError('password', { type: 'manual', message: description });
            } else {
                 description = error.message;
            }
            toast({ variant: 'destructive', title: 'Verification Failed', description });
        }
    };
    
    const handleBack = () => setCurrentStep(prev => prev - 1);
    const steps = [<Step1 form={form} onNext={handleNext} />, <Step2 form={form} />];
    const progress = ((currentStep + 1) / steps.length) * 100;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <Building className="mx-auto h-8 w-8 text-primary mb-2" />
                    <DialogTitle className="text-center text-2xl">Become a Vendor</DialogTitle>
                    <DialogDescription className="text-center">Complete the steps to start creating and selling events.</DialogDescription>
                </DialogHeader>
                
                <div className="py-4 space-y-4">
                    <Progress value={progress} className="w-full" />
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                            <AnimatePresence mode="wait">
                                <motion.div key={currentStep}>
                                    {steps[currentStep]}
                                </motion.div>
                            </AnimatePresence>
                             <DialogFooter className="mt-6 pt-4 border-t">
                                {currentStep > 0 && (
                                    <Button type="button" variant="outline" onClick={handleBack}>
                                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                    </Button>
                                )}
                                {currentStep === steps.length - 1 && (
                                    <Button type="submit" disabled={form.formState.isSubmitting}>
                                        <Check className="mr-2 h-4 w-4" /> Complete Setup
                                    </Button>
                                )}
                            </DialogFooter>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
