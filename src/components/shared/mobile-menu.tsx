
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, PlusCircle, User, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/events', icon: Compass, label: 'Discover' },
  { href: '/create-ticket', icon: PlusCircle, label: 'Craft', vendorOnly: true },
  { href: '/dashboard', icon: Ticket, label: 'My Tickets', userOnly: true },
  { href: '/profile/settings', icon: User, label: 'Profile', userOnly: true },
];

export function MobileMenu() {
    const pathname = usePathname();
    const { user } = useUser();
    const firestore = useFirestore();

    const userDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    const { data: userData } = useDoc(userDocRef);
    const isVendor = userData?.roles?.includes('vendor');

    const filteredNavItems = navItems.filter(item => {
        if (item.vendorOnly) return !!user && isVendor;
        if (item.userOnly) return !!user;
        return true;
    });

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-background/80 backdrop-blur-md border-t border-border z-40 md:hidden">
      <nav className="h-full">
        <ul className="flex justify-around items-center h-full">
          {filteredNavItems.map((item) => {
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
      </nav>
    </div>
  );
}
