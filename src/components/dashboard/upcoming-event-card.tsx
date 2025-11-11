
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, Ticket } from 'lucide-react';
import type { Event } from '@/lib/types';
import { format } from 'date-fns';

interface UpcomingEventCardProps {
  event: Event;
}

export function UpcomingEventCard({ event }: UpcomingEventCardProps) {
  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-card/60 backdrop-blur-sm rounded-xl flex flex-col">
        <div className="relative h-48 w-full">
            <Image
                src={event.imageUrl}
                alt={event.name}
                fill
                className="object-cover"
                data-ai-hint={event.imageHint}
            />
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
                    <span>{event.location}</span>
                </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                <div className='flex items-center gap-2'>
                    <Ticket className='h-5 w-5 text-primary'/>
                    <span className='font-bold'>1 Ticket</span>
                </div>
                <Button asChild variant="outline">
                    <Link href="#">View Details</Link>
                </Button>
            </div>
      </CardContent>
    </Card>
  );
}
