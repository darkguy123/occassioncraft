
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserNav } from './user-nav';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import type { User } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { Notifications } from './notifications';
import { PlusCircle, ShoppingCart } from 'lucide-react';
import { useLoader } from '@/context/loader-context';
import { useCart } from '@/context/cart-context';

const DEFAULT_LOGO_URL = 'https://firebasestorage.googleapis.com/v0/b/studio-8569439258-4b916.firebasestorage.app/o/public%2Fassets%2Fremove-photos-background-removed%20(1).png?alt=media&token=e95cb4d3-18c7-48b8-93f8-656354e39a3f';

export function Header() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { showLoader } = useLoader();
  const { cart } = useCart();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData } = useDoc<User>(userDocRef);

  const handleLinkClick = () => {
    showLoader();
  };

  const isVendor = userData && (userData.roles || []).includes('vendor');
  const isAdmin = userData && (userData.roles || []).includes('admin');
  const vendorLinkHref = isVendor ? "/vendor/dashboard" : "/vendor";
  const vendorLinkText = isVendor ? "My Dashboard" : "Host Your Event";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
           <Link href="/" className="mr-6 flex items-center space-x-2" onClick={handleLinkClick}>
            <Image src={DEFAULT_LOGO_URL} alt="OccasionCraft Logo" width={140} height={32} className="h-8 w-auto" priority />
          </Link>
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link href="/events" className="transition-colors hover:text-foreground/80 text-foreground/60" onClick={handleLinkClick}>
              Discover Events
            </Link>
            <Link href={vendorLinkHref} className="transition-colors hover:text-foreground/80 text-foreground/60" onClick={handleLinkClick}>
                {vendorLinkText}
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {!isUserLoading &&
            (user ? (
              <>
                {(isVendor || isAdmin) && (
                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/create-event" onClick={handleLinkClick}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create Event
                        </Link>
                    </Button>
                     <Button variant="ghost" size="icon" className="relative" asChild>
                      <Link href="/vendor/checkout">
                        <ShoppingCart className="h-5 w-5" />
                        {cart.length > 0 && (
                           <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                            {cart.length}
                           </span>
                        )}
                        <span className="sr-only">View Cart</span>
                      </Link>
                    </Button>
                  </div>
                )}
                <Notifications />
                <UserNav />
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login" onClick={handleLinkClick}>Log In</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup" onClick={handleLinkClick}>Sign Up</Link>
                </Button>
              </>
            ))}
        </div>
      </div>
    </header>
  );
}
