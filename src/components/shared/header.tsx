
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserNav } from './user-nav';
import { Ticket } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useUser } from '@/firebase';

export function Header() {
  const { user, isUserLoading } = useUser();
  const [logoUrl, setLogoUrl] = useState<string>('/assets/logo.png');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const updateLogo = () => {
      const savedLogo = localStorage.getItem('websiteLogo');
      if (savedLogo) {
        setLogoUrl(savedLogo);
      } else {
        setLogoUrl('/assets/logo.png');
      }
    };

    updateLogo(); // Initial check

    // Listen for changes from other tabs/windows
    window.addEventListener('storage', updateLogo);

    return () => {
      window.removeEventListener('storage', updateLogo);
    };
  }, [isClient]);

  const currentLogo = isClient ? logoUrl : '/assets/logo.png';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            {currentLogo ? (
                <Image src={currentLogo} alt="OccasionCraft Logo" width={140} height={32} className="h-8 w-auto" priority unoptimized />
              ) : (
                <Ticket className="h-6 w-6 text-primary" />
            )}
          </Link>
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
