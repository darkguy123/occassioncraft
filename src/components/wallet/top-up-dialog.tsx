'use client';

import { useForm } from 'react-hook-form';
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
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { DollarSign } from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';
import { useUser, useFirestore, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

interface TopUpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const topUpSchema = z.object({
  amount: z.coerce.number().positive({ message: 'Amount must be greater than zero.' }).min(5, { message: 'Minimum top-up is ₦500' }),
});

type TopUpFormValues = z.infer<typeof topUpSchema>;

export function TopUpDialog({ isOpen, onClose }: TopUpDialogProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const form = useForm<TopUpFormValues>({
    resolver: zodResolver(topUpSchema),
    defaultValues: {
      amount: 1000,
    },
  });
  
  const amount = form.watch('amount');

  const paystackConfig = {
    reference: uuidv4(),
    email: user?.email || '',
    amount: amount * 100, // Amount in kobo
    currency: 'NGN',
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
  };

  const initializePayment = usePaystackPayment(paystackConfig);

  const onPaymentSuccess = (reference: any) => {
    if (!user || !firestore) return;

    const walletRef = doc(firestore, 'wallets', user.uid);
    const transactionRef = doc(collection(firestore, `wallets/${user.uid}/transactions`), reference.reference);

    // This is a simplified update. A real-world app should use a transaction.
    updateDocumentNonBlocking(walletRef, {
        balance: (form.getValues('amount') || 0) + (user as any)?.wallet?.balance || 0,
    });

    addDocumentNonBlocking(transactionRef, {
        id: reference.reference,
        walletId: user.uid,
        amount: form.getValues('amount'),
        type: 'top-up',
        date: new Date().toISOString(),
        description: 'Wallet top-up via Paystack',
    });

    toast({
      title: 'Top-Up Successful!',
      description: `Successfully added ₦${amount.toFixed(2)} to your wallet.`,
    });

    form.reset();
    onClose();
  };

  const onPaymentClose = () => {
    toast({
      variant: 'destructive',
      title: 'Payment Closed',
      description: 'The payment modal was closed.',
    });
  };

  const onSubmit = () => {
      if (!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY.startsWith('pk_test_xxxx')) {
            toast({
                variant: 'destructive',
                title: 'Setup Required',
                description: 'The Paystack public key is not configured in the .env file.',
            });
            return;
        }
    initializePayment({ onSuccess: onPaymentSuccess, onClose: onPaymentClose });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Top Up Your Wallet</DialogTitle>
          <DialogDescription>
            Enter the amount you wish to add. You will be redirected to Paystack to complete the payment.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (NGN)</FormLabel>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                    <FormControl>
                      <Input type="number" placeholder="1000" className="pl-8" {...field} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit">Proceed to Payment</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
