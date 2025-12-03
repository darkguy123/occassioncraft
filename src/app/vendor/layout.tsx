'use client';

import { VendorSidebar } from "@/components/vendor/vendor-sidebar";
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

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
  
  const { data: userData, isLoading: isUserDataLoading } = useDoc<User>(userDocRef);
  
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');

  useEffect(() => {
    const isLoading = isUserLoading || isUserDataLoading;

    if (isLoading) {
      setAuthStatus('loading');
      return;
    }

    if (!user) {
      router.push('/login');
      setAuthStatus('unauthorized');
      return;
    }
      
    const isVendor = (userData?.roles || []).includes('vendor');

    if (isVendor) {
      setAuthStatus('authorized');
    } else {
      setAuthStatus('unauthorized');
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You do not have permission to access the vendor dashboard.",
      });
      router.push('/vendor');
    }
  }, [isUserLoading, isUserDataLoading, user, userData, router, toast]);

  if (authStatus !== 'authorized') {
    return (
      <div className="flex min-h-screen">
        <aside className="w-64 flex-shrink-0 border-r bg-background p-4">
            <Skeleton className="h-8 w-3/4 mb-8" />
            <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
            </div>
        </aside>
        <main className="flex-1 bg-muted/30 p-8">
            <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <VendorSidebar />
      <main className="flex-1 bg-muted/30">{children}</main>
    </div>
  );
}
