
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

function NotificationItem({ notification }: { notification: Notification }) {
  return (
    <div className="flex items-start gap-4 border-b p-4 last:border-b-0">
      {!notification.read && (
        <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
      )}
      <div className={`flex-1 space-y-1 ${notification.read ? 'opacity-60' : ''}`}>
        <Link href={notification.link || '#'} className="group">
          <p className="font-semibold group-hover:text-primary group-hover:underline">
            {notification.title}
          </p>
          <p className="text-sm text-muted-foreground">
            {notification.description}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {notification.createdAt
              ? formatDistanceToNow(new Date(notification.createdAt), {
                  addSuffix: true,
                })
              : ''}
          </p>
        </Link>
      </div>
    </div>
  );
}


export default function NotificationsPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const notificationsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(
        collection(firestore, 'users', user.uid, 'notifications'),
        orderBy('createdAt', 'desc')
        );
    }, [user, firestore]);

    const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);

  return (
    <div className="container mx-auto max-w-2xl py-12 px-4">
      <div className="space-y-2 mb-8">
        <h1 className="text-4xl font-bold font-headline">Notifications</h1>
        <p className="text-muted-foreground">Your recent account activity and updates.</p>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>All Notifications</CardTitle>
            <CardDescription>A complete history of your notifications.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
            {isLoading && (
                <div className="p-4 space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
            )}
            {!isLoading && (!notifications || notifications.length === 0) ? (
                 <div className="py-24 text-center text-muted-foreground">
                    <Bell className="mx-auto h-12 w-12 mb-4" />
                    <p className="font-semibold">No notifications yet</p>
                    <p className="text-sm">When you get a notification, it will show up here.</p>
                </div>
            ) : (
                <div className="flex flex-col">
                    {notifications?.map((notification) => (
                        <NotificationItem key={notification.id} notification={notification} />
                    ))}
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
