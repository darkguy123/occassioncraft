
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Event, Ticket, UserTicket } from '@/lib/types';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Ticket as TicketIcon, MapPin, Calendar, User as UserIcon, AlertTriangle, Download, FileImage, FileText } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { toPng, toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';


const DEFAULT_LOGO_URL = 'https://firebasestorage.googleapis.com/v0/b/studio-8569439258-4b916.firebasestorage.app/o/public%2Flogo.png?alt=media&token=1d01f9c3-5c82-4541-b819-25f0a7398a61';

const TicketDesign = ({ eventData, ticketData, qrCodeUrl, user }: { eventData: Event, ticketData: Ticket, qrCodeUrl: string, user: any }) => {
    const formattedDate = eventData.date ? format(new Date(eventData.date), "EEEE, MMM d, yyyy") : 'Date';
    const formattedTime = eventData.startTime || 'Time';
    const [logoUrl, setLogoUrl] = useState<string>(DEFAULT_LOGO_URL);

    useEffect(() => {
        const savedLogo = localStorage.getItem('websiteLogo');
        setLogoUrl(savedLogo || DEFAULT_LOGO_URL);
    }, []);
    
    return (
        <Card id="ticket-to-download" className={cn(
            "w-full max-w-md rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br relative transition-all duration-300 from-slate-50 to-slate-200 dark:from-slate-800 dark:to-slate-900"
        )}>
            {ticketData?.ticketImageUrl && (
                <Image src={ticketData.ticketImageUrl} alt="Ticket background" fill className="object-cover blur-md opacity-50" />
            )}

            <div className="p-1 backdrop-blur-sm bg-white/10 rounded-2xl relative z-10">
                {ticketData?.ticketBrandingImageUrl && (
                    <div className="h-24 relative rounded-t-xl overflow-hidden mb-2">
                        <Image src={ticketData.ticketBrandingImageUrl} alt="Branding" fill className="object-cover" />
                    </div>
                )}

                <div className={cn("p-6 md:p-8", ticketData?.ticketBrandingImageUrl && "pt-2")}>

                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-widest text-black/60 dark:text-white/60">Event Ticket</p>
                            <h3 className="font-headline text-3xl font-bold leading-tight text-black dark:text-white">{eventData.name}</h3>
                        </div>
                        <TicketIcon className="h-8 w-8 text-black/60 dark:text-white/60" />
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
                            <span className="truncate font-medium text-black dark:text-white">{ticketData.attendeeName || user?.displayName || 'Ticket Holder'}</span>
                        </div>
                         {ticketData.class && (
                            <div className="flex items-center gap-3">
                                <TicketIcon className="h-4 w-4 shrink-0 text-black/60 dark:text-white/60" />
                                <span className="truncate font-medium text-black dark:text-white">{ticketData.class}</span>
                            </div>
                         )}
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
                        <Image src={logoUrl} alt="Logo" width={80} height={20} className="h-5 w-auto" />
                        <p className="text-black/60 dark:text-white/60">ID: {ticketData.id.substring(0, 13)}</p>
                    </div>
                </div>
            </div>
        </Card>
    );
};


export default function TicketDetailsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const params = useParams();
    const { eventId, ticketId } = params;

    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const ticketRef = useRef<HTMLDivElement>(null);

    const ticketDocRef = useMemoFirebase(() => {
        if (!firestore || !ticketId) return null;
        // The definitive ticket data lives in the root /tickets collection
        return doc(firestore, `tickets`, ticketId as string);
    }, [firestore, ticketId]);

    const eventDocRef = useMemoFirebase(() => {
        if (!firestore || !eventId) return null;
        return doc(firestore, 'events', eventId as string);
    }, [firestore, eventId]);

    const { data: ticketData, isLoading: isTicketLoading } = useDoc<Ticket>(ticketDocRef);
    const { data: eventData, isLoading: isEventLoading } = useDoc<Event>(eventDocRef);

    const isLoading = isTicketLoading || isEventLoading;

    useEffect(() => {
        if (ticketId && eventId && ticketData?.userId) {
            const generateQrCode = async () => {
                try {
                    const validationUrl = `${window.location.origin}/validate?ticketId=${ticketId}&eventId=${eventId}&userId=${ticketData.userId}`;
                    const url = await QRCode.toDataURL(validationUrl, {
                        errorCorrectionLevel: 'H',
                        margin: 1,
                        width: 256,
                        color: { dark: '#000000', light: '#FFFFFF' }
                    });
                    setQrCodeUrl(url);
                } catch (err) {
                    console.error('Could not generate QR code', err);
                }
            };
            generateQrCode();
        }
    }, [ticketId, eventId, ticketData]);

    const handleDownload = useCallback((format: 'jpg' | 'pdf') => {
        const node = document.getElementById('ticket-to-download');
        if (!node) return;

        const imageOptions = { 
            quality: 0.98, 
            cacheBust: true,
            fetchRequestInit: {
                mode: 'cors' as RequestMode,
                credentials: 'omit' as RequestCredentials
            }
        };

        const downloadImage = (dataUrl: string) => {
            const link = document.createElement('a');
            link.download = `ticket-${ticketId}.jpg`;
            link.href = dataUrl;
            link.click();
        };
        
        const downloadPdf = (dataUrl: string) => {
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [node.offsetWidth, node.offsetHeight]
            });
            pdf.addImage(dataUrl, 'PNG', 0, 0, node.offsetWidth, node.offsetHeight);
            pdf.save(`ticket-${ticketId}.pdf`);
        }

        if (format === 'jpg') {
            toJpeg(node, imageOptions)
                .then(downloadImage)
                .catch((err) => console.error('oops, something went wrong!', err));
        } else {
             toPng(node, imageOptions)
                .then(downloadPdf)
                .catch((err) => console.error('oops, something went wrong!', err));
        }
    }, [ticketId]);

    if (isLoading) {
        return (
            <div className="container mx-auto max-w-lg py-12 px-4 space-y-4">
                <Skeleton className="h-[600px] w-full rounded-2xl" />
                <Skeleton className="h-12 w-full rounded-lg" />
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
    
    // Authorization check: User must own the ticket OR be the vendor for the event.
    const isOwner = ticketData.userId === user?.uid;
    const isVendor = eventData.vendorId === user?.uid;

    if (!isOwner && !isVendor) {
         return (
            <div className="container mx-auto max-w-lg py-12 px-4">
                 <Card className="p-8 text-center bg-destructive/10 border-destructive">
                    <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-destructive-foreground">Access Denied</h2>
                    <p className="text-destructive-foreground/80 mt-2">
                        You do not have permission to view this ticket.
                    </p>
                 </Card>
            </div>
        )
    }

    return (
        <div className="min-h-[calc(100vh-8rem)] w-full flex flex-col items-center justify-center bg-secondary/30 p-4 space-y-6">
            <div ref={ticketRef}>
                <TicketDesign eventData={eventData} ticketData={ticketData} qrCodeUrl={qrCodeUrl} user={user} />
            </div>
            <Card className="w-full max-w-md p-4">
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button className="w-full" onClick={() => handleDownload('jpg')}>
                        <FileImage className="mr-2 h-4 w-4" /> Download JPG
                    </Button>
                    <Button className="w-full" variant="outline" onClick={() => handleDownload('pdf')}>
                        <FileText className="mr-2 h-4 w-4" /> Download PDF
                    </Button>
                </div>
            </Card>
        </div>
    )
}
