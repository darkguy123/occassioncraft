
'use client';

import type { TicketFormValues } from '@/app/create-ticket/page';
import { Card } from '@/components/ui/card';
import { Ticket, MapPin, Calendar, User, AlignLeft } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Skeleton } from './ui/skeleton';

interface TicketStylePreviewProps {
    eventData: Partial<TicketFormValues>;
}


export function TicketStylePreview({ eventData }: TicketStylePreviewProps) {
    const { name, date, startTime, location, ticketImageUrl, ticketBrandingImageUrl, attendeeName, guestPhotoUrl, package: ticketPackage } = eventData;
    const [qrCodeUrl, setQrCodeUrl] = useState('');

    useEffect(() => {
        const generateQrCode = async () => {
            try {
                const url = await QRCode.toDataURL('sample-ticket-id-preview', {
                    errorCorrectionLevel: 'H',
                    margin: 1,
                    width: 200,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });
                setQrCodeUrl(url);
            } catch (err) {
                console.error('Could not generate QR code', err);
            }
        };

        generateQrCode();
    }, []);

    const formattedDate = date ? format(date, "EEEE, MMM d, yyyy") : 'Your Date';
    const formattedTime = startTime || 'Your Time';
    
    return (
        <Card className={cn(
            "w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br relative transition-all duration-300 from-slate-50 to-slate-200 dark:from-slate-800 dark:to-slate-900"
        )}>
            {ticketImageUrl && (
                <Image src={ticketImageUrl} alt="Ticket background" fill className="object-cover blur-sm opacity-50" />
            )}

            <div className="p-1 backdrop-blur-sm bg-white/10 rounded-2xl relative z-10">
                {ticketBrandingImageUrl && (
                    <div className="h-24 relative rounded-t-xl overflow-hidden mb-2">
                        <Image src={ticketBrandingImageUrl} alt="Branding" fill className="object-cover" />
                    </div>
                )}

                <div className={cn("p-6 md:p-8", ticketBrandingImageUrl && "pt-2")}>

                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-widest text-black/60 dark:text-white/60">Event Ticket</p>
                            <h3 className="font-headline text-3xl font-bold leading-tight text-black dark:text-white">{name || 'Your Event Title'}</h3>
                        </div>
                        <Ticket className="h-8 w-8 text-black/60 dark:text-white/60" />
                    </div>

                    <div className="mt-8 space-y-4 text-sm">
                        <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 shrink-0 text-black/60 dark:text-white/60" />
                            <span className="font-medium text-black dark:text-white">{formattedDate} at {formattedTime}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 shrink-0 text-black/60 dark:text-white/60" />
                            <span className="truncate font-medium text-black dark:text-white">{location || 'Your Location'}</span>
                        </div>
                         <div className="flex items-center gap-3">
                            <User className="h-4 w-4 shrink-0 text-black/60 dark:text-white/60" />
                            <span className="truncate font-medium text-black dark:text-white">{attendeeName || 'Ticket Holder'}</span>
                        </div>
                    </div>

                    <div className="mt-8 text-center flex flex-col items-center justify-center">
                        {ticketPackage === 'Premium Individual' && guestPhotoUrl && (
                            <div className="mb-4">
                                <Image src={guestPhotoUrl} alt="Guest" width={80} height={80} className="rounded-full h-20 w-20 object-cover border-2 border-white shadow-lg" />
                            </div>
                        )}
                        {qrCodeUrl ? (
                            <div className="bg-white p-2 rounded-lg shadow-lg">
                                <Image
                                    src={qrCodeUrl}
                                    alt="Ticket QR Code"
                                    width={200}
                                    height={200}
                                    data-ai-hint="qr code"
                                />
                            </div>
                        ) : (
                            <Skeleton className="h-48 w-48" />
                        )}
                        <p className="text-xs mt-3 text-black/60 dark:text-white/60">Scan this at the event entrance</p>
                    </div>

                    <div className="mt-8 border-t-2 border-dashed border-black/20 dark:border-white/20 pt-4 flex items-center justify-between gap-4 text-xs">
                        <p className={cn("font-semibold text-lg", "text-black dark:text-white")}>{eventData.class || 'Regular'}</p>
                        <p className="text-black/60 dark:text-white/60">ID: ...</p>
                    </div>
                </div>
            </div>
        </Card>
    )
}

    