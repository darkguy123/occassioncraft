
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserNav } from './user-nav';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useFirebase } from '@/firebase';
import type { User } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { Notifications } from './notifications';
import { PlusCircle, ShoppingCart, Download } from 'lucide-react';
import { useLoader } from '@/context/loader-context';
import { useCart } from '@/context/cart-context';
import { usePwaInstall } from '@/context/pwa-install-context';

const DEFAULT_LOGO_URL = '/recommenoptimized.svg'; // Path relative to the /public directory
const MOBILE_LOGO_URL = '/recommenoptimized.svg';

export function Header() {
  const { user, isUserLoading } = useUser();
  const { siteSettings, isSiteSettingsLoading } = useFirebase();
  const firestore = useFirestore();
  const { showLoader } = useLoader();
  const { cart } = useCart();
  const { canInstall, triggerInstall } = usePwaInstall();
  
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

  const logoUrl = siteSettings?.logoUrl || DEFAULT_LOGO_URL;

  return (
    <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-[#336BFC] to-[#1e40af] text-white">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
           <Link href="/" className="mr-6 flex items-center space-x-2" onClick={handleLinkClick}>
            {isSiteSettingsLoading ? (
              <div className="h-8 w-36 bg-white/20 rounded-md animate-pulse" />
            ) : (
              <>
                <Image src={logoUrl} alt="OccasionCraft Logo" width={140} height={32} className="h-8 w-auto hidden md:block" priority unoptimized />
                <Image src={MOBILE_LOGO_URL} alt="OccasionCraft Logo" width={32} height={32} className="h-8 w-8 block md:hidden" priority unoptimized />
              </>
            )}
           </Link>
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link href="/events" className="transition-colors hover:text-white text-white/80" onClick={handleLinkClick}>
              Discover Events
            </Link>
            <Link href={vendorLinkHref} className="transition-colors hover:text-white text-white/80" onClick={handleLinkClick}>
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
                    <Button asChild variant="destructive" size="sm" className="relative">
                        <Link href="/create-event" onClick={handleLinkClick}>
                            <span className="md:hidden"><PlusCircle className="h-5 w-5" /></span>
                            <span className="hidden md:flex items-center">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Create Event
                            </span>
                        </Link>
                    </Button>
                     <Button variant="ghost" size="icon" className="relative text-white hover:bg-white/20 hover:text-white" asChild>
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
                 {canInstall && (
                    <Button onClick={triggerInstall} variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white">
                        <Download className="h-5 w-5" />
                        <span className="sr-only">Install App</span>
                    </Button>
                )}
                <Notifications />
                <UserNav />
              </>
            ) : (
              <>
                 {canInstall && (
                    <Button onClick={triggerInstall} variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white">
                        <Download className="h-5 w-5" />
                        <span className="sr-only">Install App</span>
                    </Button>
                )}
                <Button variant="ghost" asChild className="text-white hover:bg-white/20 hover:text-white">
                  <Link href="/login" onClick={handleLinkClick}>Log In</Link>
                </Button>
                <Button asChild variant="destructive">
                  <Link href="/signup" onClick={handleLinkClick}>Sign Up</Link>
                </Button>
              </>
            ))}
        </div>
      </div>
    </header>
  );
}
