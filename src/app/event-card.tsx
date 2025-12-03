
import Image from 'next/image';
import Link from 'next/link';
import type { Event } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Lock, MapPin, Ticket } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

type EventCardProps = {
  event: Event;
};

export default function EventCard({ event }: EventCardProps) {
  return (
    <Link href={`/events/${event.id}`} className="group">
      <Card className="overflow-hidden h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <CardHeader className="p-0 relative">
          <Image
            src={event.bannerUrl || 'https://picsum.photos/seed/placeholder/600/400'}
            alt={event.name}
            width={600}
            height={400}
            className="w-full h-48 object-cover"
            data-ai-hint={event.name}
          />
        </CardHeader>
        <CardContent className="p-4 flex-grow">
          <h3 className="font-headline font-semibold text-lg leading-tight truncate group-hover:text-primary">{event.name}</h3>
          <p className="text-muted-foreground text-sm mt-1">{event.organizer}</p>
          <div className="flex items-center text-sm text-muted-foreground mt-2">
            <Calendar className="h-4 w-4 mr-2" />
            <span>{format(new Date(event.date), 'MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground mt-1">
            <MapPin className="h-4 w-4 mr-2" />
            <span className="truncate">{event.location}</span>
          </div>
        </CardContent>
        <CardFooter className="p-4 flex justify-between items-center bg-secondary/50">
          <div className="flex items-center">
            {event.isPrivate ? (
                <>
                    <Lock className="h-5 w-5 mr-2 text-amber-500" />
                    <span className="font-bold text-lg text-amber-500">Private Event</span>
                </>
            ) : (
                <>
                    <Ticket className="h-5 w-5 mr-2 text-primary" />
                    <span className="font-bold text-lg">Tickets Available</span>
                </>
            )}
          </div>
          <Button variant="outline" size="sm">
            Details
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
