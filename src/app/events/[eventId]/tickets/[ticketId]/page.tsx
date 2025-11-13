
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
    const ticketImageUrl = eventData?.ticketImageUrl;
    const ticketBrandingImageUrl = eventData?.ticketBrandingImageUrl;

    useEffect(() => {
        if (ticketId && eventId && user) {
            const generateQrCode = async () => {
                try {
                    // Embed all necessary info in the QR code for validation
                    const validationUrl = `${window.location.origin}/validate?ticketId=${ticketId}&eventId=${eventId}&userId=${user.uid}`;
                    const url = await QRCode.toDataURL(validationUrl, {
                        errorCorrectionLevel: 'H',
                        margin: 1,
                        width: 256,
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
        }
    }, [ticketId, eventId, user]);

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
                "w-full max-w-md rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br relative transition-all duration-300 from-slate-50 to-slate-200 dark:from-slate-800 dark:to-slate-900"
            )}>
                {ticketImageUrl && (
                    <Image src={ticketImageUrl} alt="Ticket background" layout="fill" className="object-cover blur-md opacity-50" />
                )}

                <div className="p-1 backdrop-blur-sm bg-white/10 rounded-2xl relative z-10">
                    {ticketBrandingImageUrl && (
                        <div className="h-24 relative rounded-t-xl overflow-hidden mb-2">
                            <Image src={ticketBrandingImageUrl} alt="Branding" layout="fill" className="object-cover" />
                        </div>
                    )}

                    <div className={cn("p-6 md:p-8", ticketBrandingImageUrl && "pt-2")}>

                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-xs uppercase tracking-widest text-black/60 dark:text-white/60">Event Ticket</p>
                                <h3 className="font-headline text-3xl font-bold leading-tight text-black dark:text-white">{eventData.name}</h3>
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
                                <span className="truncate font-medium text-black dark:text-white">{eventData.isOnline ? 'Online Event' : eventData.location}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <UserIcon className="h-4 w-4 shrink-0 text-black/60 dark:text-white/60" />
                                <span className="truncate font-medium text-black dark:text-white">{user?.displayName || 'Ticket Holder'}</span>
                            </div>
                        </div>

                        <div className="mt-8 text-center flex flex-col items-center justify-center">
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
                            <p className="text-black/60 dark:text-white/60">Ticket ID: {ticketId}</p>
                            <p className="text-black/60 dark:text-white/60">Purchased: {format(new Date(ticketData.purchaseDate), "PP")}</p>
                        </div>
                    </div>

                </div>
            </Card>
        </div>
    )
}
