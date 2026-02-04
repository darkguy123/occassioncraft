
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, arrayUnion, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, PartyPopper } from 'lucide-react';
import type { User as UserType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import Link from 'next/link';

export default function BecomeAVendorPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isUpgrading, setIsUpgrading] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserType>(userDocRef);

  const isVendor = userData?.roles?.includes('vendor');
  const isLoading = isUserLoading || isUserDataLoading;

  useEffect(() => {
    if (!isLoading && isVendor) {
      // If user is already a vendor, redirect them to the dashboard.
      router.replace('/vendor/dashboard');
    }
  }, [isLoading, isVendor, router]);

  const handleUpgrade = async () => {
    if (!user || !firestore || !userDocRef) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to upgrade.' });
        return;
    }

    setIsUpgrading(true);

    // Simulate verification and processing delay
    setTimeout(async () => {
        try {
            // Step 1: Update the user's role
            await updateDoc(userDocRef, {
                roles: arrayUnion('vendor')
            });

            // Step 2: Create the vendor document
            const vendorRef = doc(firestore, 'vendors', user.uid);
            await setDoc(vendorRef, {
                id: user.uid,
                userId: user.uid,
                companyName: `${user.displayName || 'My'}'s Company`,
                description: 'Ready to host amazing events!',
                contactEmail: user.email,
                status: 'approved',
                createdAt: new Date().toISOString(),
                pricingTier: 'Free',
            }, { merge: true });

            toast({
                title: 'Upgrade Successful!',
                description: 'Welcome! You now have access to all vendor tools.',
            });

            // Redirect to the vendor dashboard after successful upgrade
            router.push('/vendor/dashboard');

        } catch (error: any) {
            console.error("Error upgrading account:", error);
            toast({
                variant: 'destructive',
                title: 'Upgrade Failed',
                description: error.message || 'An unexpected error occurred. Please try again.',
            });
            setIsUpgrading(false);
        }
    }, 5000); // 5-second delay
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

  return (
    <div className="container mx-auto max-w-md py-12 px-4">
        {isUpgrading ? (
            <Card>
                <CardContent className="p-10 text-center">
                    <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-6" />
                    <h2 className="text-2xl font-bold font-headline">Upgrading Your Account</h2>
                    <p className="text-muted-foreground mt-2">Please hold on while we verify your details and set up your vendor tools.</p>
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
                    <p className="text-muted-foreground mb-6">By clicking the button below, you'll gain immediate access to our full suite of vendor tools.</p>
                    <Button size="lg" className="w-full" onClick={handleUpgrade}>
                        Upgrade to a Vendor Account
                    </Button>
                </CardContent>
            </Card>
        )}
    </div>
  );
}
