
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, Calendar, Ticket, Building, Settings, ShieldCheck, Image } from 'lucide-react';

const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/events', icon: Calendar, label: 'Events' },
    { href: '/admin/users', icon: Users, label: 'Users' },
    { href: '/admin/vendors', icon: Building, label: 'Vendors' },
    { href: '/admin/tickets', icon: Ticket, label: 'All Tickets' },
    { href: '/admin/backgrounds', icon: Image, label: 'Backgrounds' },
    { href: '/admin/settings', icon: Settings, label: 'Settings' },
];

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-full h-full md:w-64 flex-shrink-0 border-r bg-background">
            <div className="flex h-full flex-col">
                <div className="p-4 border-b">
                    <Link href="/admin" className="flex items-center gap-2 font-bold text-lg">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                        <span>Admin Panel</span>
                    </Link>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/admin');
                        return (
                            <Link
                                key={item.label}
                                href={item.href || '#'}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted",
                                    isActive && "text-primary bg-muted"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </aside>
    );
}
