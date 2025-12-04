
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, User, Ticket, QrCode, LayoutDashboard, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User as UserType } from '@/lib/types';
import { Button } from '../ui/button';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/events', icon: Compass, label: 'Discover' },
  // Center button is handled separately
  { href: '/vendor', icon: LayoutDashboard, label: 'Vendor', vendorOrScanner: true },
  { href: '/validate', icon: QrCode, label: 'Scan', vendorOrScanner: true },
];

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
    const isAdmin = userData?.roles?.includes('admin');
    const isScanner = userData?.roles?.includes('scanner');
    const canScan = isVendor || isAdmin || isScanner;
    const canCraft = isVendor || isAdmin;

    const filteredNavItems = navItems.filter(item => {
        if (!item.vendorOrScanner) return true;
        if (!user) return false; // Hide vendor/scanner links if not logged in
        if (item.label === 'Scan') return canScan;
        if (item.label === 'Vendor') return isVendor || isAdmin;
        return true;
    });

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 h-16 w-[90vw] max-w-sm bg-background/80 backdrop-blur-md border border-border shadow-lg rounded-full z-40 md:hidden">
      <nav className="h-full">
        <ul className="flex justify-around items-center h-full relative">
            {/* Regular Nav Items */}
            {filteredNavItems.slice(0, 2).map((item) => {
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
            
            {/* Regular Nav Items */}
            {filteredNavItems.slice(2).map((item) => {
                let href = item.href;
                if (item.label === 'Vendor' && isVendor) {
                    href = '/vendor/dashboard';
                }
                const isActive = (pathname === href) || (href !== '/' && pathname.startsWith(href));
                return (
                <li key={item.href}>
                    <Link href={href} className="flex flex-col items-center justify-center gap-1 text-muted-foreground w-16">
                        <item.icon className={cn("h-6 w-6", isActive && "text-primary")} />
                        <span className={cn("text-xs", isActive && "text-primary font-semibold")}>{item.label}</span>
                    </Link>
                </li>
                );
            })}
        </ul>
         {/* Center Action Button */}
         {canCraft && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[calc(50%+10px)]">
                    <Button asChild className="rounded-full w-16 h-16 bg-primary shadow-lg" size="icon">
                        <Link href="/create-ticket">
                            <Palette className="h-7 w-7" />
                            <span className="sr-only">Craft Ticket</span>
                        </Link>
                    </Button>
            </div>
         )}
      </nav>
    </div>
  );
}

