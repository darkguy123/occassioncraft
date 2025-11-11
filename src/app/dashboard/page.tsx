
'use client';

import { Card, CardTitle, CardDescription } from "@/components/ui/card"
import { sampleEvents, userTickets } from '@/lib/placeholder-data';
import { UpcomingEventCard } from '@/components/dashboard/upcoming-event-card';

export default function UserDashboardPage() {
    const myEvents = sampleEvents.filter(event => 
        userTickets.some(ticket => ticket.eventId === event.id)
    );

  return (
    <div className="container mx-auto max-w-7xl py-12 px-4">
      <div className="space-y-2 mb-8">
        <h1 className="text-4xl font-bold font-headline">My Tickets</h1>
        <p className="text-muted-foreground">All your upcoming events in one place.</p>
      </div>

      <div className="space-y-8">
        {myEvents.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myEvents.map(event => (
                    <UpcomingEventCard key={event.id} event={event} />
                ))}
            </div>
        ) : (
            <Card className="text-center p-12 bg-card/80 backdrop-blur-sm">
                <CardTitle>No Tickets Yet</CardTitle>
                <CardDescription className="mt-2">When you purchase tickets for an event, they will appear here.</CardDescription>
            </Card>
        )}
      </div>
    </div>
  );
}
