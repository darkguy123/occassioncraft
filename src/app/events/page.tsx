'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import EventCard from '@/components/event-card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

function EventsDisplay() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q');
  const firestore = useFirestore();

  const { data: allEvents, isLoading: isAllEventsLoading } = useCollection<Event>(
      useMemoFirebase(() => firestore ? collection(firestore, 'events') : null, [firestore])
  );
  
  const filteredEvents = useMemo(() => {
    if (!allEvents) return [];
    if (!queryParam) return allEvents;

    const lowercasedQuery = queryParam.toLowerCase();
    return allEvents.filter(event => 
        event.name.toLowerCase().includes(lowercasedQuery) ||
        (event.description && event.description.toLowerCase().includes(lowercasedQuery)) ||
        (event.location && event.location.toLowerCase().includes(lowercasedQuery))
    );
  }, [allEvents, queryParam]);

  const isLoading = isAllEventsLoading;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Button variant="ghost" asChild>
            <Link href="/" className="flex items-center text-muted-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          {queryParam ? (
            <>
              <h1 className="text-3xl font-bold font-headline mt-2">
                Search results for "{queryParam}"
              </h1>
               <p className="text-muted-foreground">{filteredEvents?.length || 0} result(s) found.</p>
            </>
          ) : (
            <h1 className="text-3xl font-bold font-headline mt-2">
                All Upcoming Events
            </h1>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-64 w-full" /></CardContent></Card>
            ))}
        </div>
      ) : filteredEvents && filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEvents.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-20 border-2 border-dashed rounded-lg">
          <p className="text-xl">No available events</p>
          <p className="mt-2">Try searching for a different keyword or check back later.</p>
        </div>
      )}
    </div>
  );
}

export default function EventsPage() {
    return (
        <Suspense fallback={<div className="container text-center p-12">Loading events...</div>}>
            <EventsDisplay />
        </Suspense>
    )
}
