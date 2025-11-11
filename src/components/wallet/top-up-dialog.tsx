
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
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { DollarSign } from 'lucide-react';

interface TopUpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const topUpSchema = z.object({
  amount: z.coerce.number().positive({ message: 'Amount must be greater than zero.' }).min(5, { message: 'Minimum top-up is $5.00' }),
});

type TopUpFormValues = z.infer<typeof topUpSchema>;

export function TopUpDialog({ isOpen, onClose }: TopUpDialogProps) {
  const { toast } = useToast();

  const form = useForm<TopUpFormValues>({
    resolver: zodResolver(topUpSchema),
    defaultValues: {
      amount: 10,
    },
  });

  const onSubmit = (data: TopUpFormValues) => {
    // In a real app, you would integrate a payment gateway here.
    console.log('Simulating top-up with:', data.amount);

    toast({
      title: 'Top-Up Successful (Simulated)',
      description: `Successfully added $${data.amount.toFixed(2)} to your wallet.`,
    });
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Top Up Your Wallet</DialogTitle>
          <DialogDescription>
            Enter the amount you wish to add. This is a simulation and no real transaction will occur.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (USD)</FormLabel>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input type="number" placeholder="20.00" className="pl-8" {...field} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Confirm Top Up</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
