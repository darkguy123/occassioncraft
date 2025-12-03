
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
    const { name, date, startTime, location, ticketImageUrl, ticketBrandingImageUrl, attendeeName, guestPhotoUrl, package: ticketPackage, templateId } = eventData;
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
            "w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br relative transition-all duration-300",
            templateId === 'classic' && "from-slate-50 to-slate-200 dark:from-slate-800 dark:to-slate-900",
            templateId === 'modern' && "from-zinc-100 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900",
            templateId === 'minimal' && "from-white to-gray-100 dark:from-gray-900 dark:to-black",
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
                            <p className={cn(
                                "text-xs uppercase tracking-widest",
                                templateId === 'classic' && "text-black/60 dark:text-white/60",
                                templateId === 'modern' && "text-black/70 dark:text-white/70",
                                templateId === 'minimal' && "text-gray-500",
                            )}>Event Ticket</p>
                            <h3 className={cn(
                                "font-bold leading-tight",
                                templateId === 'classic' && "font-headline text-3xl text-black dark:text-white",
                                templateId === 'modern' && "font-sans text-4xl tracking-tighter text-black dark:text-white",
                                templateId === 'minimal' && "font-serif text-2xl text-black dark:text-white"
                            )}>{name || 'Your Event Title'}</h3>
                        </div>
                        <Ticket className={cn("h-8 w-8",
                             templateId === 'classic' && "text-black/60 dark:text-white/60",
                             templateId === 'modern' && "text-black/70 dark:text-white/70",
                             templateId === 'minimal' && "text-gray-500",
                        )} />
                    </div>

                    <div className="mt-8 space-y-4 text-sm">
                        <div className="flex items-center gap-3">
                            <Calendar className={cn("h-4 w-4 shrink-0",
                                templateId === 'classic' && "text-black/60 dark:text-white/60",
                                templateId === 'modern' && "text-black/70 dark:text-white/70",
                                templateId === 'minimal' && "text-gray-500",
                            )} />
                            <span className={cn("font-medium", templateId === 'minimal' ? 'font-serif' : 'font-sans', 'text-black dark:text-white')}>{formattedDate} at {formattedTime}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <MapPin className={cn("h-4 w-4 shrink-0",
                                templateId === 'classic' && "text-black/60 dark:text-white/60",
                                templateId === 'modern' && "text-black/70 dark:text-white/70",
                                templateId === 'minimal' && "text-gray-500",
                            )} />
                            <span className={cn("truncate font-medium", templateId === 'minimal' ? 'font-serif' : 'font-sans', 'text-black dark:text-white')}>{location || 'Your Location'}</span>
                        </div>
                         <div className="flex items-center gap-3">
                            <User className={cn("h-4 w-4 shrink-0",
                                templateId === 'classic' && "text-black/60 dark:text-white/60",
                                templateId === 'modern' && "text-black/70 dark:text-white/70",
                                templateId === 'minimal' && "text-gray-500",
                            )} />
                            <span className={cn("truncate font-medium", templateId === 'minimal' ? 'font-serif' : 'font-sans', 'text-black dark:text-white')}>{attendeeName || 'Ticket Holder'}</span>
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
                        <p className={cn("text-xs mt-3",
                            templateId === 'classic' && "text-black/60 dark:text-white/60",
                            templateId === 'modern' && "text-black/70 dark:text-white/70",
                            templateId === 'minimal' && "text-gray-500",
                        )}>Scan this at the event entrance</p>
                    </div>

                    <div className={cn("mt-8 border-t-2 pt-4 flex items-center justify-between gap-4 text-xs",
                         templateId === 'classic' && "border-dashed border-black/20 dark:border-white/20",
                         templateId === 'modern' && "border-solid border-black/30 dark:border-white/30",
                         templateId === 'minimal' && "border-dotted border-gray-400"
                    )}>
                        <p className={cn("font-semibold", 
                             templateId === 'classic' && "text-lg text-black dark:text-white",
                             templateId === 'modern' && "text-base text-black dark:text-white",
                             templateId === 'minimal' && "text-sm font-serif text-black dark:text-white"
                        )}>{eventData.class || 'Regular'}</p>
                         <p className={cn(
                            templateId === 'classic' && "text-black/60 dark:text-white/60",
                            templateId === 'modern' && "text-black/70 dark:text-white/70",
                            templateId === 'minimal' && "text-gray-500",
                        )}>ID: ...</p>
                    </div>
                </div>
            </div>
        </Card>
    )
}
