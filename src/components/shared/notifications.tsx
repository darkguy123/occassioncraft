
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Bell,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
  updateDocumentNonBlocking,
} from '@/firebase';
import { collection, query, orderBy, limit, doc } from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '../ui/skeleton';

export function Notifications() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isOpen, setIsOpen] = React.useState(false);

  const notificationsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
  }, [user, firestore]);

  const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);

  const unreadCount = React.useMemo(() => {
    return notifications?.filter((n) => !n.read).length || 0;
  }, [notifications]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && notifications && firestore && user) {
      // Mark all visible notifications as read
      notifications.forEach((notification) => {
        if (!notification.read) {
          const notifRef = doc(firestore, 'users', user.uid, 'notifications', notification.id);
          updateDocumentNonBlocking(notifRef, { read: true });
        }
      });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
              {unreadCount}
            </span>
          )}
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 md:w-96">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-semibold">Notifications</h3>
          {notifications && notifications.length > 0 && (
              <button className="text-xs text-primary hover:underline">
                Mark all as read
              </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
            {isLoading && (
                 <div className="p-4 space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            )}
          {!isLoading && (!notifications || notifications.length === 0) ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No new notifications
            </p>
          ) : (
            notifications?.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start gap-4 border-b p-4 last:border-b-0"
              >
                {!notification.read && (
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                )}
                <div className={`flex-1 space-y-1 ${notification.read ? 'opacity-70' : ''}`}>
                   <Link href={notification.link || '#'} className="hover:underline">
                    <p className="font-medium">{notification.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {notification.description}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      }) : ''}
                    </p>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t p-2 text-center">
            <Link href="#" className="text-sm text-muted-foreground hover:text-primary">
                View all notifications
            </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
