
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
import { collection, query, orderBy, limit, doc, writeBatch } from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export function Notifications() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isOpen, setIsOpen] = React.useState(false);
  const { toast } = useToast();

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
  
  const handleMarkAllAsRead = async () => {
    if (!user || !firestore || !notifications) return;

    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) {
        toast({ title: "No unread notifications."});
        return;
    }

    const batch = writeBatch(firestore);
    unreadNotifications.forEach(notification => {
        const notifRef = doc(firestore, 'users', user.uid, 'notifications', notification.id);
        batch.update(notifRef, { read: true });
    });

    try {
        await batch.commit();
        toast({
            title: "Notifications Marked as Read",
            description: "All your notifications have been updated.",
        });
    } catch (error) {
        console.error("Error marking notifications as read: ", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not mark notifications as read.",
        });
    }
  }


  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-white hover:bg-white/20 hover:text-white">
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
              <button onClick={handleMarkAllAsRead} className="text-xs text-primary hover:underline" disabled={unreadCount === 0}>
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
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
                <div className={`flex-1 space-y-1 ${notification.read ? 'opacity-70' : ''}`}>
                   <Link href={notification.link || '#'} className="hover:underline" onClick={() => setIsOpen(false)}>
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
            <Button variant="link" asChild className="text-sm text-muted-foreground hover:text-primary">
                <Link href="/notifications">
                    View all notifications
                </Link>
            </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
