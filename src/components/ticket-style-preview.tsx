
'use client';

import type { EventFormValues } from '@/app/create-event/page';
import { Card } from '@/components/ui/card';
import { Ticket, Sparkles, MapPin, Calendar, Clock } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';

interface TicketStylePreviewProps {
    eventData: Partial<EventFormValues>;
}

export function TicketStylePreview({ eventData }: TicketStylePreviewProps) {
    const { name, date, startTime, location } = eventData;
    const qrCodeImage = {
        imageUrl: '/assets/qr-code.png',
        imageHint: 'qr code'
    };

    const formattedDate = date ? format(date, "MMM d, yyyy") : 'Your Date';
    const formattedTime = startTime || 'Your Time';

    return (
        <Card className="max-w-sm mx-auto rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-primary/80 to-accent/80 relative text-white">
            <div className="p-6 backdrop-blur-sm">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <p className="text-xs uppercase tracking-widest opacity-80">Event Ticket</p>
                        <h3 className="font-headline text-2xl font-bold leading-tight">{name || 'Your Event Title'}</h3>
                    </div>
                    <Ticket className="h-8 w-8 opacity-90" />
                </div>

                <div className="mt-8 space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 shrink-0 opacity-80" />
                        <span>{formattedDate} at {formattedTime}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 shrink-0 opacity-80" />
                        <span className="truncate">{location || 'Your Location'}</span>
                    </div>
                </div>

                 <div className="mt-6 border-t-2 border-dashed border-white/30 pt-6 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                        <p className="text-xs opacity-80">Jane Doe</p>
                        <p className="font-semibold">General Admission</p>
                    </div>
                    <div className="bg-white p-1 rounded-md shadow-lg">
                         <Image
                            src={qrCodeImage.imageUrl}
                            alt="QR Code"
                            width={64}
                            height={64}
                            data-ai-hint={qrCodeImage.imageHint}
                        />
                    </div>
                </div>
            </div>
             {/* Decorative circles */}
            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-background rounded-full"></div>
            <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-background rounded-full"></div>
        </Card>
    )
}
