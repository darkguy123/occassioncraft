
'use client';

import { VendorSidebar } from "@/components/vendor/vendor-sidebar";
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { User, Vendor } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { PanelLeft, AlertTriangle } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

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
  
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized' | 'pending' | 'rejected'>('loading');

  useEffect(() => {
    const isLoading = isUserLoading || isUserDataLoading || isVendorDataLoading;

    if (isLoading) {
      setAuthStatus('loading');
      return;
    }

    if (!user) {
      router.push('/login?redirect=/vendor');
      setAuthStatus('unauthorized');
      return;
    }
      
    const isVendorRole = (userData?.roles || []).includes('vendor');

    if (!isVendorRole) {
      // This case is for users who are not vendors at all. They get redirected to the vendor landing page.
      setAuthStatus('unauthorized');
      router.push('/vendor');
      return;
    }
    
    // At this point, the user HAS the 'vendor' role. We now check their vendor document status.
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
                // Fallback for an unexpected status
                setAuthStatus('pending');
                break;
        }
    } else {
        // This is a rare edge case: user has 'vendor' role but no vendor document.
        // This could happen if an admin assigns the role but the vendor doc creation fails.
        // Treat them as 'pending' to prevent a redirect loop.
        setAuthStatus('pending');
        console.warn("User has vendor role but no vendor document. Defaulting to 'pending' status.");
    }

  }, [isUserLoading, isUserDataLoading, isVendorDataLoading, user, userData, vendorData, router, toast]);

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
        <div className="flex flex-col items-center justify-center min-h-screen bg-secondary p-4 text-center">
            <Card className="max-w-md">
                <CardHeader>
                    <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
                    <CardTitle className="mt-4 text-2xl">{authStatus === 'pending' ? 'Application Pending' : 'Application Rejected'}</CardTitle>
                    <CardDescription>
                        {authStatus === 'pending'
                            ? "Your vendor application is currently under review. You will be notified once it's approved. Thanks for your patience!"
                            : "We're sorry, but your vendor application was not approved at this time. Please contact support if you believe this is an error."
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/">Go to Homepage</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
  }


  if (authStatus !== 'authorized') {
      // Fallback for unauthorized, though specific redirects should handle it.
       return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-secondary p-4 text-center">
             <p>Redirecting...</p>
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
