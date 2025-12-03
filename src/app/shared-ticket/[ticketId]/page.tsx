
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Event, Ticket } from '@/lib/types';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Download, FileImage, FileText, UserPlus } from 'lucide-react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
import { TicketDesign } from '@/components/ticket-design';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function SharedTicketPage() {
    const firestore = useFirestore();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { ticketId } = params;

    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const ticketRef = useRef<HTMLDivElement>(null);

    const ticketDocRef = useMemoFirebase(() => {
        if (!firestore || !ticketId) return null;
        return doc(firestore, `tickets`, ticketId as string);
    }, [firestore, ticketId]);

    const { data: ticketData, isLoading: isTicketLoading } = useDoc<Ticket>(ticketDocRef);

    const eventDocRef = useMemoFirebase(() => {
        if (!firestore || !ticketData?.eventId) return null;
        return doc(firestore, 'events', ticketData.eventId);
    }, [firestore, ticketData?.eventId]);

    const { data: eventData, isLoading: isEventLoading } = useDoc<Event>(eventDocRef);

    const isLoading = isTicketLoading || (ticketData && isEventLoading);

    useEffect(() => {
        if (ticketId && ticketData?.eventId && ticketData?.userId) {
            const generateQrCode = async () => {
                try {
                    const validationUrl = `${window.location.origin}/validate?ticketId=${ticketId}&eventId=${ticketData.eventId}&userId=${ticketData.userId}`;
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
    }, [ticketId, ticketData]);

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

        toast({ title: 'Preparing Download...', description: `Your ticket will be downloaded as a ${format.toUpperCase()} file.` });

        const downloadAction = (dataUrl: string) => {
            if (format === 'jpg') {
                const link = document.createElement('a');
                link.download = `ticket-${ticketId}.jpg`;
                link.href = dataUrl;
                link.click();
            } else {
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'px',
                    format: [node.offsetWidth + 20, node.offsetHeight + 20]
                });
                pdf.addImage(dataUrl, 'PNG', 10, 10, node.offsetWidth, node.offsetHeight);
                pdf.save(`ticket-${ticketId}.pdf`);
            }
        };
        
        toJpeg(node, imageOptions)
            .then(downloadAction)
            .catch((err) => console.error('oops, something went wrong!', err));

    }, [ticketId, toast]);

    if (isLoading) {
        return (
            <div className="container mx-auto max-w-lg py-12 px-4 space-y-4">
                <Skeleton className="h-[600px] w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-lg" />
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
                        This ticket does not exist or the link is invalid.
                    </p>
                 </Card>
            </div>
        )
    }

    return (
        <div className="min-h-[calc(100vh-8rem)] w-full flex flex-col items-center justify-center bg-secondary/30 p-4 space-y-6">
            <div ref={ticketRef}>
                <TicketDesign eventData={eventData} ticketData={ticketData} qrCodeUrl={qrCodeUrl} user={null} />
            </div>
            <Card className="w-full max-w-md p-4">
                <CardHeader className='p-2 text-center'>
                    <CardTitle>Manage Your Ticket</CardTitle>
                    <CardDescription>Download your ticket or sign up to save it to your OccasionCraft account.</CardDescription>
                </CardHeader>
                <CardContent className='p-2'>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Button className="w-full" onClick={() => handleDownload('pdf')}>
                            <FileText className="mr-2 h-4 w-4" /> Download PDF
                        </Button>
                        <Button className="w-full" onClick={() => handleDownload('jpg')}>
                            <FileImage className="mr-2 h-4 w-4" /> Download JPG
                        </Button>
                    </div>
                     <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">Or</span>
                        </div>
                    </div>
                    <Button variant="secondary" className="w-full" asChild>
                        <Link href={`/signup?redirect=/events/${eventId}/tickets/${ticketId}`}>
                            <UserPlus className="mr-2 h-4 w-4" /> Sign Up & Save Ticket
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
