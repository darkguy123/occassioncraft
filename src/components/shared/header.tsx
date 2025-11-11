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

export function Header() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [logoUrl, setLogoUrl] = useState<string>('/assets/logo.png');
  const [hasMounted, setHasMounted] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData } = useDoc<User>(userDocRef);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    
    const updateLogo = () => {
      const savedLogo = localStorage.getItem('websiteLogo');
      if (savedLogo) {
        setLogoUrl(savedLogo);
      } else {
        setLogoUrl('/assets/logo.png');
      }
    };

    updateLogo();

    window.addEventListener('storage', updateLogo);

    return () => {
      window.removeEventListener('storage', updateLogo);
    };
  }, [hasMounted]);

  const isVendor = userData && (userData.roles || []).includes('vendor');
  const vendorLinkHref = hasMounted && isVendor ? "/vendor/dashboard" : "/vendor";
  const vendorLinkText = hasMounted && isVendor ? "My Dashboard" : "Host Your Event";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
           <Link href="/" className="mr-6 flex items-center space-x-2">
            {hasMounted && logoUrl ? (
                <Image src={logoUrl} alt="OccasionCraft Logo" width={140} height={32} className="h-8 w-auto" />
              ) : (
                <div style={{ width: 140, height: 32 }} />
            )}
          </Link>
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link href="/events" className="transition-colors hover:text-foreground/80 text-foreground/60">
              Discover Events
            </Link>
            <Link href={vendorLinkHref} className="transition-colors hover:text-foreground/80 text-foreground/60">
                {vendorLinkText}
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {!isUserLoading &&
            (user ? (
              <>
                <Notifications />
                <UserNav />
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">Log In</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </>
            ))}
        </div>
      </div>
    </header>
  );
}