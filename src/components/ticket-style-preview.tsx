
'use client';

import type { EventFormValues } from '@/app/create-event/page';
import { Card } from '@/components/ui/card';
import { Ticket, MapPin, Calendar } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface TicketStylePreviewProps {
    eventData: Partial<EventFormValues>;
}

const ticketStyles = {
    simple: {
        gradient: "from-slate-50 to-slate-200 dark:from-slate-800 dark:to-slate-900",
        textColor: "text-slate-800 dark:text-slate-200",
        mutedTextColor: "text-slate-600 dark:text-slate-400",
        highlightTextColor: "text-slate-900 dark:text-slate-50",
    },
    standard: {
        gradient: "from-blue-100 to-indigo-200 dark:from-blue-900 dark:to-indigo-950",
        textColor: "text-blue-800 dark:text-blue-200",
        mutedTextColor: "text-blue-600 dark:text-blue-400",
        highlightTextColor: "text-blue-900 dark:text-blue-50",
    },
    minimal: {
        gradient: "from-gray-900 to-black",
        textColor: "text-gray-200",
        mutedTextColor: "text-gray-400",
        highlightTextColor: "text-white",
    },
};

export function TicketStylePreview({ eventData }: TicketStylePreviewProps) {
    const { name, date, startTime, location, ticketStyle = 'simple' } = eventData;
    const style = ticketStyles[ticketStyle];
    const [qrCodeUrl, setQrCodeUrl] = useState('');

    useEffect(() => {
        const generateQrCode = async () => {
            try {
                // Use a placeholder value for the preview
                const url = await QRCode.toDataURL('sample-ticket-id', {
                    errorCorrectionLevel: 'H',
                    margin: 1,
                    color: {
                        dark: ticketStyle === 'minimal' ? '#FFFFFF' : '#000000',
                        light: '#00000000'
                    }
                });
                setQrCodeUrl(url);
            } catch (err) {
                console.error('Could not generate QR code', err);
            }
        };

        generateQrCode();
    }, [ticketStyle]);


    const formattedDate = date ? format(date, "MMM d, yyyy") : 'Your Date';
    const formattedTime = startTime || 'Your Time';

    return (
        <Card className={cn(
            "max-w-sm mx-auto rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br relative transition-all duration-300",
            style.gradient
        )}>
            {ticketStyle === 'standard' && (
                 <div className="absolute inset-0 bg-[url('/assets/subtle-pattern.svg')] opacity-10 dark:opacity-20"></div>
            )}
            <div className="p-6 backdrop-blur-sm bg-white/10 rounded-2xl relative z-10">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <p className={cn("text-xs uppercase tracking-widest", style.mutedTextColor)}>Event Ticket</p>
                        <h3 className={cn("font-headline text-2xl font-bold leading-tight", style.highlightTextColor)}>{name || 'Your Event Title'}</h3>
                    </div>
                    <Ticket className={cn("h-8 w-8", style.mutedTextColor)} />
                </div>

                <div className="mt-8 space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                        <Calendar className={cn("h-4 w-4 shrink-0", style.mutedTextColor)} />
                        <span className={style.textColor}>{formattedDate} at {formattedTime}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <MapPin className={cn("h-4 w-4 shrink-0", style.mutedTextColor)} />
                        <span className={cn("truncate", style.textColor)}>{location || 'Your Location'}</span>
                    </div>
                </div>

                 <div className={cn("mt-6 border-t-2 border-dashed pt-6 flex items-center justify-between gap-4", ticketStyle === 'minimal' ? "border-white/20" : "border-black/20")}>
                    <div className="space-y-1">
                        <p className={cn("text-xs", style.mutedTextColor)}>Jane Doe</p>
                        <p className={cn("font-semibold", style.highlightTextColor)}>General Admission</p>
                    </div>
                    <div className="bg-white/80 p-1 rounded-md shadow-lg backdrop-blur-sm">
                         {qrCodeUrl && <Image
                            src={qrCodeUrl}
                            alt="QR Code"
                            width={64}
                            height={64}
                            data-ai-hint="qr code"
                        />}
                    </div>
                </div>
            </div>
             {/* Decorative circles for cutout effect */}
            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-muted/30 rounded-full z-0"></div>
            <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-muted/30 rounded-full z-0"></div>
        </Card>
    )
}
