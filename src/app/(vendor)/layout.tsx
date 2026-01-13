
'use client';

import { VendorSidebar } from "@/components/vendor/vendor-sidebar";
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { User, Vendor } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { VendorPendingStatus } from "@/components/vendor/vendor-pending-status";

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  
  const vendorDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'vendors', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<User>(userDocRef);
  const { data: vendorData, isLoading: isVendorDataLoading } = useDoc<Vendor>(vendorDocRef);
  
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'pending' | 'rejected'>('loading');

  const isLoading = isUserLoading || isUserDataLoading || isVendorDataLoading;

  useEffect(() => {
    if (isLoading) {
      setAuthStatus('loading');
      return;
    }

    if (!user) {
      router.push('/login?redirect=/vendor/dashboard');
      return;
    }
      
    const isVendorRole = (userData?.roles || []).includes('vendor');

    if (!isVendorRole) {
      // User is logged in but not a vendor, send them to onboarding.
      router.push('/vendor/onboarding');
      return;
    }
    
    // User has vendor role, now check their status from the vendors collection.
    if (vendorData) {
        switch (vendorData.status) {
            case 'approved':
                setAuthStatus('authorized');
                break;
            case 'pending':
                setAuthStatus('pending');
                break;
            case 'rejected':
                setAuthStatus('rejected');
                break;
            default:
                 // Fallback for unexpected status
                setAuthStatus('pending');
                break;
        }
    } else {
        // Has 'vendor' role but no vendor document. Should not happen in normal flow,
        // but we can treat them as pending or send to onboarding.
        setAuthStatus('pending');
    }

  }, [isLoading, user, userData, vendorData, router]);

  if (authStatus === 'loading') {
    return (
      <div className="flex min-h-screen">
        <aside className="w-64 flex-shrink-0 border-r bg-background p-4 hidden md:block">
            <Skeleton className="h-8 w-3/4 mb-8" />
            <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
            </div>
        </aside>
        <main className="flex-1 bg-muted/30 p-4 md:p-8">
            <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }
  
  if (authStatus === 'pending' || authStatus === 'rejected') {
    return (
        <VendorPendingStatus status={authStatus} vendorData={vendorData}/>
    )
  }

  // Covers 'unauthorized' and any other state before 'authorized' is confirmed.
  // This shows a simple loading screen during the brief moment of redirection.
  if (authStatus !== 'authorized') {
       return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-secondary p-4 text-center">
             <p>Loading...</p>
        </div>
      );
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden md:block">
        <VendorSidebar />
      </div>
       <div className="flex flex-col flex-1">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <VendorSidebar />
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-semibold">Vendor Portal</h1>
        </header>
        <main className="flex-1 bg-muted/30">{children}</main>
      </div>
    </div>
  );
}
