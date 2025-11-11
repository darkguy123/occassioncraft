'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, setDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Vendor } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Building } from 'lucide-react';

const vendorSchema = z.object({
  companyName: z.string().min(2, { message: 'Company name must be at least 2 characters.' }),
  companyDescription: z.string().min(10, { message: 'Description must be at least 10 characters.' }).optional(),
});

type VendorFormValues = z.infer<typeof vendorSchema>;

export default function VendorRegistrationPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const vendorRef = useMemoFirebase(() => (user ? doc(firestore, 'vendors', user.uid) : null), [firestore, user]);
  const { data: vendorData, isLoading: isVendorLoading } = useDoc<Vendor>(vendorRef);

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      companyName: '',
      companyDescription: '',
    },
  });

  const isLoading = isUserLoading || isVendorLoading;

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (vendorData) {
        // If they already have a vendor record, send them to the dashboard
        router.push('/vendor/dashboard');
      }
    }
  }, [isLoading, user, vendorData, router]);

  const onSubmit = (data: VendorFormValues) => {
    if (!user || !vendorRef) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to register.' });
      return;
    }

    const newVendorData = {
      userId: user.uid,
      companyName: data.companyName,
      description: data.companyDescription || '',
      contactEmail: user.email || '',
      status: 'pending' as const,
    };

    setDocumentNonBlocking(vendorRef, newVendorData, { merge: true });

    toast({
      title: 'Application Submitted',
      description: 'Your vendor application is now pending review. You will be redirected.',
    });

    router.push('/vendor/dashboard');
  };

  if (isLoading || vendorData) {
    return (
      <div className="container mx-auto max-w-2xl py-12 px-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <div className="flex justify-end">
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto max-w-2xl py-12 px-4">
      <Card>
        <CardHeader className="text-center">
          <Building className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="text-3xl font-headline">Become a Vendor</CardTitle>
          <CardDescription>Fill out the form below to apply to sell tickets on our platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Awesome Events Inc." {...field} />
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
                    <FormLabel>Company Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about what makes your events special."
                        className="min-h-32"
                        {...field}
                      />
                    </FormControl>
                     <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" size="lg">
                Submit Application
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
