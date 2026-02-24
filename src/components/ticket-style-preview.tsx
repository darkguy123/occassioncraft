
'use client';

import type { TicketFormValues } from '@/app/create-ticket/page';
import { Card } from '@/components/ui/card';
import { Ticket, MapPin, Calendar, User } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Skeleton } from './ui/skeleton';

interface TicketStylePreviewProps {
    eventData: Partial<TicketFormValues> & { name?: string };
}

export function TicketStylePreview({ eventData }: TicketStylePreviewProps) {
    const { guestPhotoUrl, package: ticketPackage } = eventData;
    const [qrCodeUrl, setQrCodeUrl] = useState('');

    useEffect(() => {
        const generateQrCode = async () => {
            try {
                const url = await QRCode.toDataURL('sample-ticket-id-preview', {
                    errorCorrectionLevel: 'H', margin: 1, width: 200,
                });
                setQrCodeUrl(url);
            } catch (err) {
                console.error('Could not generate QR code', err);
            }
        };
        generateQrCode();
    }, []);
    
    return (
        <Card className="w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-800 dark:to-slate-900 relative">
            {eventData.ticketImageUrl && <Image src={eventData.ticketImageUrl} alt="background" fill className="object-cover blur-sm opacity-50" />}
                <div className="relative z-10 p-8">
                    <div className="flex justify-between items-start">
                    <div>
                            <p className="text-xs uppercase tracking-widest text-black/60 dark:text-white/60">Event Ticket</p>
                            <h3 className="font-headline text-3xl font-bold leading-tight text-black dark:text-white">{eventData.name || 'Your Event Title'}</h3>
                    </div>
                    <Ticket className="h-8 w-8 text-black/60 dark:text-white/60" />
                </div>

                <div className="mt-8 space-y-4 text-sm">
                    <div className="flex items-center gap-3"><Calendar className="h-4 w-4 shrink-0 text-black/60 dark:text-white/60" /><span className="font-medium text-black dark:text-white">{eventData.dates?.[0]?.date ? format(eventData.dates[0].date, "EEEE, MMM d, yyyy") : 'Your Date'} at {eventData.dates?.[0]?.startTime || 'Your Time'}</span></div>
                    <div className="flex items-center gap-3"><MapPin className="h-4 w-4 shrink-0 text-black/60 dark:text-white/60" /><span className="truncate font-medium text-black dark:text-white">{eventData.location || 'Your Location'}</span></div>
                    <div className="flex items-center gap-3"><User className="h-4 w-4 shrink-0 text-black/60 dark:text-white/60" /><span className="truncate font-medium text-black dark:text-white">{eventData.attendeeName || 'Ticket Holder'}</span></div>
                    {eventData.class && <p className="font-headline font-bold text-lg text-primary mt-1">{eventData.class}</p>}
                </div>
                    
                <div className="mt-8 text-center flex flex-col items-center justify-center">
                    {ticketPackage === 'Premium Individual' && guestPhotoUrl && (
                        <div className="mb-4">
                            <Image src={guestPhotoUrl} alt="Guest" width={80} height={80} className="rounded-full h-20 w-20 object-cover border-2 border-white shadow-lg" />
                        </div>
                    )}
                    {qrCodeUrl ? <div className="bg-white p-2 rounded-lg shadow-lg"><Image src={qrCodeUrl} alt="Ticket QR Code" width={200} height={200} /></div> : <Skeleton className="h-48 w-48" />}
                    <p className="text-xs mt-3 text-black/60 dark:text-white/60">Scan this at the event entrance</p>
                </div>

                </div>
        </Card>
    );
}
