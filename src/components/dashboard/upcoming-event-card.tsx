
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin } from 'lucide-react';
import type { Event } from '@/lib/types';
import { format } from 'date-fns';

interface UpcomingEventCardProps {
  event: Event;
}

type TimeLeft = {
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
};

const calculateTimeLeft = (eventDate: string): TimeLeft => {
  const difference = +new Date(eventDate) - +new Date();
  let timeLeft: TimeLeft = {};

  if (difference > 0) {
    timeLeft = {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }

  return timeLeft;
};

export function UpcomingEventCard({ event }: UpcomingEventCardProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({});
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;

    setTimeLeft(calculateTimeLeft(event.date));

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(event.date));
    }, 1000);

    return () => clearInterval(timer);
  }, [hasMounted, event.date]);
  
  const hasEnded = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl">
      <div className="grid md:grid-cols-3">
        <div className="md:col-span-1 relative h-48 md:h-full min-h-[150px]">
          <Image
            src={event.imageUrl}
            alt={event.name}
            fill
            className="object-cover"
            data-ai-hint={event.imageHint}
          />
        </div>
        <div className="md:col-span-2">
           <CardContent className="p-6">
                <h3 className="font-headline font-semibold text-2xl leading-tight text-primary">{event.name}</h3>
                <p className="text-muted-foreground text-sm mt-1">by {event.organizer}</p>
                
                <div className="my-6 min-h-[68px] flex items-center justify-center">
                  {hasMounted && Object.keys(timeLeft).length > 0 ? (
                    hasEnded ? (
                      <div className="text-center text-lg font-bold text-destructive">Event has ended</div>
                    ) : (
                      <div className="flex justify-center gap-4 text-center">
                          <div>
                              <div className="text-3xl font-bold">{String(timeLeft.days).padStart(2, '0')}</div>
                              <div className="text-xs text-muted-foreground">Days</div>
                          </div>
                           <div>
                              <div className="text-3xl font-bold">{String(timeLeft.hours).padStart(2, '0')}</div>
                              <div className="text-xs text-muted-foreground">Hours</div>
                          </div>
                           <div>
                              <div className="text-3xl font-bold">{String(timeLeft.minutes).padStart(2, '0')}</div>
                              <div className="text-xs text-muted-foreground">Minutes</div>
                          </div>
                           <div>
                              <div className="text-3xl font-bold">{String(timeLeft.seconds).padStart(2, '0')}</div>
                              <div className="text-xs text-muted-foreground">Seconds</div>
                          </div>
                      </div>
                    )
                  ) : (
                    <div className="text-center text-lg font-bold text-muted-foreground">Loading countdown...</div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-sm">
                    <div className='space-y-2'>
                        <div className="flex items-center text-muted-foreground">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span>{format(new Date(event.date), "EEEE, MMMM d, yyyy")}</span>
                        </div>
                        <div className="flex items-center text-muted-foreground">
                            <MapPin className="h-4 w-4 mr-2" />
                            <span>{event.location}</span>
                        </div>
                    </div>
                    <Button asChild className="mt-2 sm:mt-0">
                        <Link href="#">View Details</Link>
                    </Button>
                </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
