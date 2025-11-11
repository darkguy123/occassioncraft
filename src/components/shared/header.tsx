'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserNav } from './user-nav';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useUser } from '@/firebase';

export function Header() {
  const [logoUrl, setLogoUrl] = useState<string>('/assets/logo.png');
  const [hasMounted, setHasMounted] = useState(false);
  const { user, isUserLoading } = useUser();

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


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
           {hasMounted ? (
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <Image src={logoUrl} alt="OccasionCraft Logo" width={140} height={32} className="h-8 w-auto" />
            </Link>
          ) : (
            <div className="mr-6" style={{ width: 140, height: 32 }} />
          )}
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link href="/" className="transition-colors hover:text-foreground/80 text-foreground/60">
              Discover Events
            </Link>
            <Link href="/create-event" className="transition-colors hover:text-foreground/80 text-foreground/60">
              Create an Event
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          {!isUserLoading && (
            user ? (
              <UserNav />
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">Log In</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </>
            )
          )}
        </div>
      </div>
    </header>
  );
}
