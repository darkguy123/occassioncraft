
'use client';

import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useState } from 'react';
import { PartyPopper } from 'lucide-react';

interface VendorApplicationDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const applicationSchema = z.object({
  companyName: z.string().min(2, { message: 'Company name must be at least 2 characters.' }),
  companyDescription: z.string().optional(),
});

type ApplicationFormValues = z.infer<typeof applicationSchema>;

export function VendorApplicationDialog({ isOpen, onClose }: VendorApplicationDialogProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      companyName: '',
      companyDescription: '',
    },
  });

  const onSubmit: SubmitHandler<ApplicationFormValues> = async (data) => {
    if (!user || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to apply.' });
        return;
    }

    try {
        const userRef = doc(firestore, 'users', user.uid);
        const vendorRef = doc(firestore, 'vendors', user.uid);

        // 1. Update user role
        updateDocumentNonBlocking(userRef, {
            roles: ['user', 'vendor'] // Assumes user already has 'user' role
        });

        // 2. Create new vendor document
        const vendorData = {
            id: user.uid,
            userId: user.uid,
            companyName: data.companyName,
            description: data.companyDescription,
            contactEmail: user.email,
            status: 'pending',
        };
        setDocumentNonBlocking(vendorRef, vendorData, { merge: true });

        form.reset();
        onClose();
        setShowSuccessDialog(true);
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Application Failed',
            description: error.message,
        });
    }
  };

  const closeSuccessDialog = () => {
    setShowSuccessDialog(false);
  }

  return (
    <>
        <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
            <DialogTitle>Become a Vendor</DialogTitle>
            <DialogDescription>
                Fill out the form below to apply. Your application will be reviewed by our team.
            </DialogDescription>
            </DialogHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="submit">Submit Application</Button>
                </DialogFooter>
            </form>
            </Form>
        </DialogContent>
        </Dialog>
        
        <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
            <AlertDialogContent>
                <AlertDialogHeader className="text-center items-center">
                    <PartyPopper className="h-12 w-12 text-primary" />
                    <AlertDialogTitle className="text-2xl">Application Submitted!</AlertDialogTitle>
                    <AlertDialogDescription>
                        Thank you for applying! Our team will review your application and you will be notified via email within 2-3 business days.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogAction onClick={closeSuccessDialog} className="w-full">
                    Got it!
                </AlertDialogAction>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}

