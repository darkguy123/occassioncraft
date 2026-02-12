
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, Ticket } from 'lucide-react';
import type { Event, UserTicket } from '@/lib/types';
import { format } from 'date-fns';

interface UpcomingEventCardProps {
  event: Event;
  ticket: UserTicket;
}

export function UpcomingEventCard({ event, ticket }: UpcomingEventCardProps) {
  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-card/60 backdrop-blur-sm rounded-xl flex flex-col">
        <div className="relative h-48 w-full bg-secondary">
            {event.bannerUrl ? (
              <Image
                  src={event.bannerUrl}
                  alt={event.name}
                  fill
                  className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-5xl font-bold text-muted-foreground">
                  {event.name ? event.name.charAt(0).toUpperCase() : '?'}
                </span>
              </div>
            )}
             <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
             <div className="absolute bottom-4 left-4">
                <h3 className="font-headline font-semibold text-2xl leading-tight text-white">{event.name}</h3>
                <p className="text-white/80 text-sm mt-1">by {event.organizer}</p>
             </div>
        </div>
        <CardContent className="p-6 flex-grow flex flex-col">
            <div className='space-y-2 text-sm flex-grow'>
                <div className="flex items-center text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>{format(new Date(event.date), "EEEE, MMMM d, yyyy")}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{event.isOnline ? 'Online Event' : event.location}</span>
                </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                <div className='flex items-center gap-2'>
                    <Ticket className='h-5 w-5 text-primary'/>
                    <span className='font-bold'>1 Ticket</span>
                </div>
                <Button asChild>
                    <Link href={`/events/${event.id}/tickets/${ticket.ticketId}`}>View Ticket</Link>
                </Button>
            </div>
      </CardContent>
    </Card>
  );
}
