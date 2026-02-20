'use client';

import { VendorSidebar } from "@/components/vendor/vendor-sidebar";
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';
import type { Vendor as VendorType } from '@/lib/types';
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { VendorStatusPage } from "@/components/vendor/vendor-status-page";

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const vendorDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'vendors', user.uid);
  }, [user, firestore]);
  
  const { data: vendorData, isLoading: isVendorDataLoading } = useDoc<VendorType>(vendorDocRef);

  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized' | 'pending' | 'rejected'>('loading');

  useEffect(() => {
    const isLoading = isUserLoading || isVendorDataLoading;
    if (isLoading) {
      setAuthStatus('loading');
      return;
    }

    if (!user) {
      router.push('/login?redirect=/vendor/dashboard');
      setAuthStatus('unauthorized');
      return;
    }
    
    if (vendorData) {
      if (vendorData.status === 'approved') {
          setAuthStatus('authorized');
      } else if (vendorData.status === 'pending') {
          setAuthStatus('pending');
      } else {
          setAuthStatus('rejected');
      }
    } else {
      // No vendor document exists, so they are not a vendor and have not applied
      setAuthStatus('unauthorized');
      router.push('/become-a-vendor');
    }
  }, [isUserLoading, isVendorDataLoading, user, vendorData, router]);


  if (authStatus === 'loading' || authStatus === 'unauthorized') {
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
  
  if (authStatus === 'pending') {
    return <VendorStatusPage status="pending" />;
  }

  if (authStatus === 'rejected') {
    return <VendorStatusPage status="rejected" />;
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
