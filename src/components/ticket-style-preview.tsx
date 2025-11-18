
'use client';

import type { EventFormValues } from '@/app/create-event/page';
import { Card } from '@/components/ui/card';
import { Ticket, MapPin, Calendar } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Skeleton } from './ui/skeleton';

interface TicketStylePreviewProps {
    eventData: Partial<EventFormValues>;
}


export function TicketStylePreview({ eventData }: TicketStylePreviewProps) {
    const { name, date, startTime, location, ticketImageUrl, ticketBrandingImageUrl } = eventData;
    const [qrCodeUrl, setQrCodeUrl] = useState('');

    useEffect(() => {
        const generateQrCode = async () => {
            try {
                const url = await QRCode.toDataURL('sample-ticket-id', {
                    errorCorrectionLevel: 'H',
                    margin: 1,
                    width: 128,
                    color: {
                        dark: '#000000', // Black
                        light: '#FFFFFF' // White
                    }
                });
                setQrCodeUrl(url);
            } catch (err) {
                console.error('Could not generate QR code', err);
            }
        };

        generateQrCode();
    }, []);


    const formattedDate = date ? format(date, "MMM d, yyyy") : 'Your Date';
    const formattedTime = startTime || 'Your Time';

    return (
        <Card className={cn(
            "max-w-sm mx-auto rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br relative transition-all duration-300 from-slate-50 to-slate-200 dark:from-slate-800 dark:to-slate-900"
        )}>
            {ticketImageUrl && (
                 <Image src={ticketImageUrl} alt="Ticket Background" layout="fill" className="object-cover blur-sm opacity-50" />
            )}
            
            <div className="p-1 backdrop-blur-sm bg-white/10 rounded-2xl relative z-10">
                {ticketBrandingImageUrl && (
                    <div className="h-20 relative rounded-t-xl overflow-hidden mb-2">
                        <Image src={ticketBrandingImageUrl} alt="Branding" layout="fill" className="object-cover" />
                    </div>
                )}
                <div className={cn("p-4", ticketBrandingImageUrl && "pt-2")}>

                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-widest text-black/60 dark:text-white/60">Event Ticket</p>
                            <h3 className="font-headline text-2xl font-bold leading-tight text-black dark:text-white">{name || 'Your Event Title'}</h3>
                        </div>
                        <Ticket className="h-8 w-8 text-black/60 dark:text-white/60" />
                    </div>

                    <div className="mt-6 space-y-3 text-sm">
                        <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 shrink-0 text-black/60 dark:text-white/60" />
                            <span className="text-black dark:text-white">{formattedDate} at {formattedTime}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 shrink-0 text-black/60 dark:text-white/60" />
                            <span className="truncate text-black dark:text-white">{location || 'Your Location'}</span>
                        </div>
                    </div>

                    <div className="mt-6 border-t-2 border-dashed border-black/20 dark:border-white/20 pt-6 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                            <p className="text-xs text-black/60 dark:text-white/60">Jane Doe</p>
                            <p className="font-semibold text-black dark:text-white">General Admission</p>
                        </div>
                        <div className="bg-white p-2 rounded-lg shadow-lg">
                            {qrCodeUrl ? <Image
                                src={qrCodeUrl}
                                alt="QR Code"
                                width={80}
                                height={80}
                                data-ai-hint="qr code"
                            /> : <Skeleton className="h-20 w-20" />}
                        </div>
                    </div>
                </div>
            </div>
             {/* Decorative circles for cutout effect */}
            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-muted/30 rounded-full z-0"></div>
            <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-muted/30 rounded-full z-0"></div>
        </Card>
    )
}
