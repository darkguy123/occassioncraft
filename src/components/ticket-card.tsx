'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Ticket, Event } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Ticket as TicketIcon, Share2, CheckCircle, Clock } from 'lucide-react';

type TicketCardProps = {
  ticket: Ticket;
  event?: Event;
  onShare?: (ticketId: string) => void;
  detailsLink?: string;
};

export default function TicketCard({ ticket, event, onShare, detailsLink }: TicketCardProps) {
  const hasEventImage = event?.bannerUrl;
  
  return (
    <Card className="overflow-hidden h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <CardHeader className="p-0 relative">
        {hasEventImage ? (
          <Image
            src={event!.bannerUrl}
            alt={event!.name}
            width={600}
            height={400}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-secondary flex items-center justify-center">
            <TicketIcon className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex flex-col justify-end p-4">
          <p className="text-white font-bold text-lg truncate">{event?.name || 'Event'}</p>
          <p className="text-white/80 text-sm">{ticket.package}</p>
        </div>
      </CardHeader>

      <CardContent className="p-4 flex-grow">
        <p className="font-semibold text-sm mb-2">Attendee</p>
        <p className="text-sm text-muted-foreground truncate">{ticket.attendeeName || 'N/A'}</p>
        
        <div className="mt-3 space-y-1">
          <p className="text-xs text-muted-foreground">Ticket ID</p>
          <p className="font-mono text-xs text-muted-foreground">{ticket.id.substring(0, 16)}...</p>
        </div>

        {ticket.price > 0 && (
          <div className="mt-3 p-2 rounded bg-primary/10 inline-block">
            <p className="font-bold text-sm text-primary">₦{ticket.price.toLocaleString()}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 flex flex-col gap-2 bg-secondary/50">
        {ticket.scans > 0 ? (
          <Badge variant="secondary" className="text-green-600 border-green-600 w-full justify-center">
            <CheckCircle className="mr-1 h-3 w-3"/>
            Checked In ({ticket.scans}/{ticket.maxScans})
          </Badge>
        ) : (
          <Badge variant="outline" className="w-full justify-center">Not Checked In</Badge>
        )}
        
        <div className="flex gap-2 w-full">
          {onShare && (
            <Button variant="outline" size="sm" onClick={() => onShare(ticket.id)} className="flex-1">
              <Share2 className="mr-1 h-4 w-4" /> Share
            </Button>
          )}
          {detailsLink && (
            <Button asChild size="sm" className="flex-1">
              <Link href={detailsLink}>View</Link>
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
