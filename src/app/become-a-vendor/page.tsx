
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, PartyPopper } from 'lucide-react';
import type { User as UserType, Vendor as VendorType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function BecomeAVendorPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [applicationState, setApplicationState] = useState<'idle' | 'submitting' | 'submitted'>('idle');

  const vendorDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'vendors', user.uid);
  }, [firestore, user]);

  const { data: vendorData, isLoading: isVendorDataLoading } = useDoc<VendorType>(vendorDocRef);

  const isLoading = isUserLoading || isVendorDataLoading;
  const isVendor = vendorData?.status === 'approved';

  useEffect(() => {
    if (!isLoading && isVendor) {
      router.replace('/vendor/dashboard');
    }
  }, [isLoading, isVendor, router]);

  const handleUpgrade = async () => {
    if (!user || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to apply.' });
        return;
    }

    setApplicationState('submitting');
    setIsUpgrading(true);

    try {
        const vendorRef = doc(firestore, 'vendors', user.uid);
        await setDoc(vendorRef, {
            id: user.uid,
            userId: user.uid,
            companyName: `${user.displayName || 'My'}'s Company`,
            description: 'Ready to host amazing events!',
            contactEmail: user.email,
            status: 'pending',
            createdAt: new Date().toISOString(),
            pricingTier: 'Free',
        }, { merge: true });

        toast({
            title: 'Application Submitted!',
            description: 'Your vendor application is now under review. You will be notified of the outcome.',
        });
        
        // Short delay to let user read the message before redirecting
        setTimeout(() => {
            router.push('/vendor/dashboard');
        }, 2000);

    } catch (error: any) {
        console.error("Error submitting application:", error);
        toast({
            variant: 'destructive',
            title: 'Application Failed',
            description: error.message || 'An unexpected error occurred. Please try again.',
        });
        setIsUpgrading(false);
        setApplicationState('idle');
    }
  };
  
  if (isLoading || isVendor) {
      return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
  }

  if (!user && !isLoading) {
      return (
        <div className="container mx-auto max-w-md py-12 px-4 text-center">
             <Card>
                <CardHeader>
                    <CardTitle>Please Log In</CardTitle>
                    <CardDescription>You need to be logged in to become a vendor.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild><Link href="/login?redirect=/become-a-vendor">Log In</Link></Button>
                </CardContent>
             </Card>
        </div>
      )
  }

  if (vendorData && (vendorData.status === 'pending' || vendorData.status === 'rejected')) {
       router.replace('/vendor/dashboard');
       return null;
  }

  return (
    <div className="container mx-auto max-w-md py-12 px-4">
        {isUpgrading ? (
            <Card>
                <CardContent className="p-10 text-center">
                    <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-6" />
                    <h2 className="text-2xl font-bold font-headline">Submitting Application</h2>
                    <p className="text-muted-foreground mt-2">Please hold on while we submit your application for review.</p>
                </CardContent>
            </Card>
        ) : (
            <Card>
                <CardHeader className="text-center">
                    <PartyPopper className="h-12 w-12 mx-auto text-primary" />
                    <CardTitle className="text-2xl font-bold font-headline mt-4">Become a Vendor</CardTitle>
                    <CardDescription>
                        Unlock the power to create, manage, and sell tickets for your own events.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="text-muted-foreground mb-6">By clicking the button below, your application will be submitted for admin review.</p>
                    <Button size="lg" className="w-full" onClick={handleUpgrade} disabled={applicationState !== 'idle'}>
                        Apply to be a Vendor
                    </Button>
                </CardContent>
            </Card>
        )}
    </div>
  );
}
