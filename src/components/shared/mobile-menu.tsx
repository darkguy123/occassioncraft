'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, User, Ticket, QrCode, LayoutDashboard, Palette, CalendarPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User as UserType } from '@/lib/types';
import { Button } from '../ui/button';

export function MobileMenu() {
    const pathname = usePathname();
    const { user } = useUser();
    const firestore = useFirestore();

    const userDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    
    const { data: userData } = useDoc<UserType>(userDocRef);

    const isVendor = userData?.roles?.includes('vendor');

    const mainNavItems = [
      { href: '/', icon: Home, label: 'Home' },
      { href: '/events', icon: Compass, label: 'Discover' },
    ];

    const conditionalItem = isVendor
      ? { href: '/vendor/dashboard', icon: LayoutDashboard, label: 'Vendor' }
      : { href: '/dashboard', icon: Ticket, label: 'My Tickets' };

    const actionNavItems = [
        conditionalItem,
        { href: '/validate', icon: QrCode, label: 'Scan' },
    ];


  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 h-16 w-[90vw] max-w-sm bg-background/80 backdrop-blur-md border border-border shadow-lg rounded-full z-40 md:hidden">
      <nav className="h-full">
        <ul className="flex justify-around items-center h-full relative">
            {/* Left side nav items */}
            {mainNavItems.map((item) => {
                const isActive = (pathname === item.href) || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                <li key={item.href}>
                    <Link href={item.href} className="flex flex-col items-center justify-center gap-1 text-muted-foreground w-16">
                        <item.icon className={cn("h-6 w-6", isActive && "text-primary")} />
                        <span className={cn("text-xs", isActive && "text-primary font-semibold")}>{item.label}</span>
                    </Link>
                </li>
                );
            })}

            {/* Spacer for Center Button */}
            <li className="w-16 h-16"></li>
            
            {/* Right side nav items */}
            {actionNavItems.map((item) => {
                const isActive = (pathname === item.href) || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                <li key={item.href}>
                    <Link href={item.href} className="flex flex-col items-center justify-center gap-1 text-muted-foreground w-16">
                        <item.icon className={cn("h-6 w-6", isActive && "text-primary")} />
                        <span className={cn("text-xs", isActive && "text-primary font-semibold")}>{item.label}</span>
                    </Link>
                </li>
                );
            })}
        </ul>
         {/* Center Action Button */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[calc(50%+10px)]">
            <Button asChild className="rounded-full w-16 h-16 bg-primary shadow-lg" size="icon">
                <Link href="/create-event">
                    <CalendarPlus className="h-7 w-7" />
                    <span className="sr-only">Create Event</span>
                </Link>
            </Button>
        </div>
      </nav>
    </div>
  );
}
