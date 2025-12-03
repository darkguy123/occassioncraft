'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, CalendarPlus, Ticket, QrCode, ShoppingCart, Settings } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { Badge } from '../ui/badge';

const navItems = [
    { href: '/vendor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/create-event', icon: CalendarPlus, label: 'Create Event' },
    { href: '/create-ticket', icon: Ticket, label: 'Craft Ticket' },
    { href: '/validate', icon: QrCode, label: 'Scan Tickets' },
    { href: '/vendor/checkout', icon: ShoppingCart, label: 'Cart' },
];

export function VendorSidebar() {
    const pathname = usePathname();
    const { cart } = useCart();

    return (
        <aside className="w-64 flex-shrink-0 border-r bg-background">
            <div className="flex h-full flex-col">
                <div className="p-4 border-b">
                    <Link href="/vendor/dashboard" className="flex items-center gap-2 font-bold text-lg">
                        <LayoutDashboard className="h-6 w-6 text-primary" />
                        <span>Vendor Portal</span>
                    </Link>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href) && (item.href !== '/vendor/dashboard' || pathname === '/vendor/dashboard');
                        return (
                            <Link
                                key={item.label}
                                href={item.href || '#'}
                                className={cn(
                                    "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted",
                                    isActive && "text-primary bg-muted"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                </div>
                                {item.label === 'Cart' && cart.length > 0 && (
                                    <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center">{cart.length}</Badge>
                                )}
                            </Link>
                        );
                    })}
                </nav>
                 <div className="mt-auto p-4 border-t">
                     <Link
                        href="/profile/settings"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
                    >
                        <Settings className="h-4 w-4" />
                        <span>Account Settings</span>
                    </Link>
                </div>
            </div>
        </aside>
    );
}
