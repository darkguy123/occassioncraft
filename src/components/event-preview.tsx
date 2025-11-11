
'use client';

import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, MapPin, Ticket, Sparkles } from 'lucide-react';
import type { EventFormValues } from '@/app/create-event/page';
import { format } from 'date-fns';

interface EventPreviewProps {
  eventData: Partial<EventFormValues>;
  bannerUrl: string | null | undefined;
}

export function EventPreview({ eventData, bannerUrl }: EventPreviewProps) {
  const { name, date, startTime, location } = eventData;

  const formattedDate = date ? format(date, 'EEEE, MMMM d') : 'Select a date';
  const formattedTime = startTime || 'Select a time';
  const displayPrice = 'Free'; // Simplified for now

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="rounded-2xl overflow-hidden shadow-xl relative transition-all duration-300">
        {/* Banner Image */}
        <div className="h-48 bg-secondary flex items-center justify-center relative">
          {bannerUrl ? (
            <Image src={bannerUrl} alt={name || 'Event Banner'} layout="fill" objectFit="cover" />
          ) : (
             <Sparkles className="h-12 w-12 text-muted-foreground/50" />
          )}
           <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
        
        {/* Main Content */}
        <div className="p-6 bg-card">
            {/* Title */}
            <h2 className="font-headline text-3xl font-bold tracking-tight h-10 truncate">{name || 'Your Event Title'}</h2>
            
            {/* Date and Time */}
            <div className="flex items-center text-lg font-medium text-primary mt-3">
              <Calendar className="h-5 w-5 mr-2.5" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center text-base text-muted-foreground mt-1.5">
               <Clock className="h-4 w-4 mr-3" />
               <span>{formattedTime}</span>
            </div>

             {/* Location */}
            <div className="flex items-center text-base text-muted-foreground mt-1.5">
              <MapPin className="h-4 w-4 mr-3" />
              <span className="truncate">{location || 'Your Location'}</span>
            </div>
        </div>
        
        {/* Ticket Stub */}
        <div className="bg-card relative px-6 pb-6">
            <Separator className="absolute left-0 right-0 top-0"/>
             {/* Dashed line effect */}
             <div className="absolute -top-3 left-0 right-0 flex justify-between">
                <div className="w-6 h-6 bg-muted/30 rounded-full -translate-x-3"></div>
                <div className="w-full border-b-2 border-dashed border-border/80 h-px mt-3"></div>
                <div className="w-6 h-6 bg-muted/30 rounded-full translate-x-3"></div>
            </div>
            
            <div className="mt-6 flex justify-between items-center">
                <div className="flex items-center">
                    <Ticket className="h-6 w-6 mr-3 text-primary"/>
                    <span className="text-xl font-bold">{displayPrice}</span>
                </div>
                 <div className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-bold text-lg">
                    Register
                </div>
            </div>
        </div>

      </Card>
        <div className="mt-6 bg-card rounded-2xl p-6 shadow-xl">
            <h3 className="font-headline text-xl font-bold">About this event</h3>
            <p className="text-muted-foreground mt-2 text-sm whitespace-pre-wrap h-24 overflow-hidden">{eventData.description || 'Your event description will appear here...'}</p>
        </div>
    </div>
  );
}
