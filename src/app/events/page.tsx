
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import EventCard from '@/components/event-card';
import { sampleEvents } from '@/lib/placeholder-data';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

function EventsDisplay() {
  const searchParams = useSearchParams();
  const location = searchParams.get('location');

  const filteredEvents = location
    ? sampleEvents.filter(event =>
        event.location.toLowerCase().includes(location.toLowerCase())
      )
    : sampleEvents;

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
          {location ? (
            <>
              <h1 className="text-3xl font-bold font-headline mt-2">
                Events in "{location}"
              </h1>
               <p className="text-muted-foreground">{filteredEvents.length} result(s) found.</p>
            </>
          ) : (
            <h1 className="text-3xl font-bold font-headline mt-2">
                All Upcoming Events
            </h1>
          )}
        </div>
      </div>

      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEvents.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-20 border-2 border-dashed rounded-lg">
          <p className="text-xl">No available events in this location</p>
          <p className="mt-2">Try searching for a different city or check back later.</p>
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
