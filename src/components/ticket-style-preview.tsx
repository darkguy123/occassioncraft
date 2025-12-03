
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
    const { name, date, startTime, location, ticketImageUrl, ticketBrandingImageUrl, templateId = 'classic' } = eventData;
    const [qrCodeUrl, setQrCodeUrl] = useState('');

    useEffect(() => {
        const generateQrCode = async () => {
            try {
                const url = await QRCode.toDataURL('sample-ticket-id', {
                    errorCorrectionLevel: 'H',
                    margin: 1,
                    width: 128,
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

    const formattedDate = date ? format(date, "MMM d, yyyy") : 'Your Date';
    const formattedTime = startTime || 'Your Time';
    
    // Base styles
    const baseCard = "max-w-sm mx-auto rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br relative transition-all duration-300 from-slate-50 to-slate-200 dark:from-slate-800 dark:to-slate-900";
    const baseTextColor = "text-black dark:text-white";
    const baseMutedColor = "text-black/60 dark:text-white/60";

    // Template Specific Styles
    const styles = {
        classic: {
            card: cn(baseCard),
            contentContainer: "p-4",
            header: "flex justify-between items-start",
            title: "font-headline text-2xl font-bold leading-tight",
            detailsContainer: "mt-6 space-y-3 text-sm",
            footer: "mt-6 border-t-2 border-dashed border-black/20 dark:border-white/20 pt-6 flex items-center justify-between gap-4",
            qrContainer: "bg-white p-2 rounded-lg shadow-lg",
        },
        modern: {
            card: cn(baseCard),
            contentContainer: "p-6 text-center",
            header: "flex flex-col items-center",
            title: "font-headline text-3xl font-bold leading-tight mt-2",
            detailsContainer: "mt-6 space-y-2 text-sm",
            footer: "mt-6 flex flex-col items-center gap-4",
            qrContainer: "bg-white p-2 rounded-lg shadow-lg order-first",
        },
        minimal: {
            card: cn(baseCard, "flex"),
            contentContainer: "p-6 w-2/3 flex flex-col",
            header: "flex flex-col items-start",
            title: "font-headline text-xl font-bold leading-tight",
            detailsContainer: "mt-4 space-y-2 text-xs flex-grow",
            footer: "mt-4 border-t-2 border-dashed border-black/20 dark:border-white/20 pt-4",
            qrContainer: "w-1/3 bg-slate-200 dark:bg-slate-700 flex flex-col items-center justify-center p-4",
        }
    };

    const currentStyle = styles[templateId as keyof typeof styles] || styles.classic;

    return (
        <div className={currentStyle.card}>
            {ticketImageUrl && (
                 <Image src={ticketImageUrl} alt="Ticket Background" layout="fill" className="object-cover blur-sm opacity-50" />
            )}
            
            <div className="p-1 backdrop-blur-sm bg-white/10 rounded-2xl relative z-10 flex-grow flex flex-col">
                {ticketBrandingImageUrl && templateId !== 'minimal' && (
                    <div className="h-20 relative rounded-t-xl overflow-hidden mb-2">
                        <Image src={ticketBrandingImageUrl} alt="Branding" layout="fill" className="object-cover" />
                    </div>
                )}
                <div className={cn(currentStyle.contentContainer, ticketBrandingImageUrl && "pt-2", "flex-grow flex flex-col")}>

                    <div className={currentStyle.header}>
                        <p className={cn("text-xs uppercase tracking-widest", baseMutedColor)}>Event Ticket</p>
                        <h3 className={cn(currentStyle.title, baseTextColor)}>{name || 'Your Event Title'}</h3>
                    </div>

                    <div className={cn(currentStyle.detailsContainer, 'flex-grow')}>
                        <div className="flex items-center gap-3">
                            <Calendar className={cn("h-4 w-4 shrink-0", baseMutedColor)} />
                            <span className={baseTextColor}>{formattedDate} at {formattedTime}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <MapPin className={cn("h-4 w-4 shrink-0", baseMutedColor)} />
                            <span className={cn("truncate", baseTextColor)}>{location || 'Your Location'}</span>
                        </div>
                    </div>

                    <div className={currentStyle.footer}>
                        {templateId !== 'minimal' ? (
                            <>
                                <div className="space-y-1">
                                    <p className={cn("text-xs", baseMutedColor)}>Jane Doe</p>
                                    <p className={cn("font-semibold", baseTextColor)}>General Admission</p>
                                </div>
                                <div className={currentStyle.qrContainer}>
                                    {qrCodeUrl ? <Image src={qrCodeUrl} alt="QR Code" width={80} height={80} data-ai-hint="qr code" /> : <Skeleton className="h-20 w-20" />}
                                </div>
                            </>
                        ) : (
                             <div className="space-y-1">
                                <p className={cn("text-xs font-semibold", baseTextColor)}>Jane Doe</p>
                                <p className={cn("text-xs", baseMutedColor)}>General Admission</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {templateId === 'minimal' && (
                <div className={currentStyle.qrContainer}>
                    {qrCodeUrl ? <Image src={qrCodeUrl} alt="QR Code" width={100} height={100} data-ai-hint="qr code" className="rounded-md" /> : <Skeleton className="h-24 w-24 rounded-md" />}
                    <p className={cn("text-xs mt-2", baseMutedColor)}>Scan Me</p>
                </div>
            )}
        </div>
    )
}
