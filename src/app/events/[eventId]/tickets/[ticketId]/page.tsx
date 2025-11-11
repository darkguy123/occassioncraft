
'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Event, UserTicket } from '@/lib/types';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Ticket, MapPin, Calendar, User as UserIcon, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import QRCode from 'qrcode';

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

export default function TicketDetailsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const params = useParams();
    const { eventId, ticketId } = params;

    const [qrCodeUrl, setQrCodeUrl] = useState('');
    
    const ticketDocRef = useMemoFirebase(() => {
        if (!user || !ticketId) return null;
        return doc(firestore, `users/${user.uid}/tickets`, ticketId as string);
    }, [firestore, user, ticketId]);

    const eventDocRef = useMemoFirebase(() => {
        if (!firestore || !eventId) return null;
        return doc(firestore, 'events', eventId as string);
    }, [firestore, eventId]);

    const { data: ticketData, isLoading: isTicketLoading } = useDoc<UserTicket>(ticketDocRef);
    const { data: eventData, isLoading: isEventLoading } = useDoc<Event>(eventDocRef);

    const isLoading = isTicketLoading || isEventLoading;
    const ticketStyle = eventData?.ticketStyle || 'simple';
    const style = ticketStyles[ticketStyle];

    useEffect(() => {
        if (ticketId) {
            const generateQrCode = async () => {
                try {
                    const validationUrl = `${window.location.origin}/validate?ticketId=${ticketId}`;
                    const url = await QRCode.toDataURL(validationUrl, {
                        errorCorrectionLevel: 'H',
                        margin: 1,
                        width: 256,
                        color: {
                            dark: ticketStyle === 'minimal' ? '#FFFFFF' : '#000000',
                            light: '#00000000' // Transparent background
                        }
                    });
                    setQrCodeUrl(url);
                } catch (err) {
                    console.error('Could not generate QR code', err);
                }
            };

            generateQrCode();
        }
    }, [ticketId, ticketStyle]);

    if (isLoading) {
        return (
            <div className="container mx-auto max-w-lg py-12 px-4">
                <Skeleton className="h-[450px] w-full rounded-2xl" />
            </div>
        );
    }
    
    if (!ticketData || !eventData) {
        return (
            <div className="container mx-auto max-w-lg py-12 px-4">
                 <Card className="p-8 text-center bg-destructive/10 border-destructive">
                    <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-destructive-foreground">Ticket Not Found</h2>
                    <p className="text-destructive-foreground/80 mt-2">
                        We couldn't find the ticket you're looking for. It may have been moved or deleted.
                    </p>
                 </Card>
            </div>
        )
    }

    const formattedDate = eventData.date ? format(new Date(eventData.date), "EEEE, MMM d, yyyy") : 'Date';
    const formattedTime = eventData.startTime || 'Time';

    return (
        <div className="min-h-[calc(100vh-8rem)] w-full flex items-center justify-center bg-secondary/30 p-4">
            <Card className={cn(
                "w-full max-w-md rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br relative transition-all duration-300",
                style.gradient
            )}>
                {ticketStyle === 'standard' && (
                    <div className="absolute inset-0 bg-[url('/assets/subtle-pattern.svg')] opacity-10 dark:opacity-20"></div>
                )}

                <div className="p-6 md:p-8 backdrop-blur-sm bg-white/10 rounded-2xl relative z-10">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className={cn("text-xs uppercase tracking-widest", style.mutedTextColor)}>Event Ticket</p>
                            <h3 className={cn("font-headline text-3xl font-bold leading-tight", style.highlightTextColor)}>{eventData.name}</h3>
                        </div>
                        <Ticket className={cn("h-8 w-8", style.mutedTextColor)} />
                    </div>

                    <div className="mt-8 space-y-4 text-sm">
                        <div className="flex items-center gap-3">
                            <Calendar className={cn("h-4 w-4 shrink-0", style.mutedTextColor)} />
                            <span className={cn("font-medium", style.textColor)}>{formattedDate} at {formattedTime}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <MapPin className={cn("h-4 w-4 shrink-0", style.mutedTextColor)} />
                            <span className={cn("truncate font-medium", style.textColor)}>{eventData.isOnline ? 'Online Event' : eventData.location}</span>
                        </div>
                         <div className="flex items-center gap-3">
                            <UserIcon className={cn("h-4 w-4 shrink-0", style.mutedTextColor)} />
                            <span className={cn("truncate font-medium", style.textColor)}>{user?.displayName || 'Ticket Holder'}</span>
                        </div>
                    </div>

                     <div className="mt-8 text-center flex flex-col items-center justify-center">
                        {qrCodeUrl ? (
                            <div className="bg-white/90 p-2 rounded-lg shadow-lg backdrop-blur-sm">
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
                         <p className={cn("text-xs mt-3", style.mutedTextColor)}>Scan this at the event entrance</p>
                    </div>

                    <div className={cn("mt-8 border-t-2 border-dashed pt-4 flex items-center justify-between gap-4 text-xs", ticketStyle === 'minimal' ? "border-white/20" : "border-black/20")}>
                        <p className={cn(style.mutedTextColor)}>Ticket ID: {ticketId}</p>
                        <p className={cn(style.mutedTextColor)}>Purchased: {format(new Date(ticketData.purchaseDate), "PP")}</p>
                    </div>

                </div>
            </Card>
        </div>
    )
}
