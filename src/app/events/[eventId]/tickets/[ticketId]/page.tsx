
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Event, Ticket } from '@/lib/types';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Ticket as TicketIcon, MapPin, Calendar, User as UserIcon, AlertTriangle, Download, FileImage, FileText, Share2 } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
import { TicketDesign } from '@/components/ticket-design';
import { useToast } from '@/hooks/use-toast';


export default function TicketDetailsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const params = useParams();
    const { toast } = useToast();
    const { eventId, ticketId } = params;

    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const ticketRef = useRef<HTMLDivElement>(null);

    const ticketDocRef = useMemoFirebase(() => {
        if (!firestore || !ticketId) return null;
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

        toast({ title: 'Preparing Download...', description: `Your ticket will be downloaded as a ${format.toUpperCase()} file.` });

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
                // Make the PDF slightly larger than the node to avoid cutoff
                format: [node.offsetWidth + 20, node.offsetHeight + 20]
            });
             // Center the image on the PDF page
            pdf.addImage(dataUrl, 'PNG', 10, 10, node.offsetWidth, node.offsetHeight);
            pdf.save(`ticket-${ticketId}.pdf`);
        }

        if (format === 'jpg') {
            toJpeg(node, imageOptions)
                .then(downloadImage)
                .catch((err) => console.error('oops, something went wrong!', err));
        } else {
             toJpeg(node, imageOptions) // Use JPEG for PDF as well for consistency
                .then(downloadPdf)
                .catch((err) => console.error('oops, something went wrong!', err));
        }
    }, [ticketId, toast]);

    const handleShare = () => {
        const shareUrl = `${window.location.origin}/shared-ticket/${ticketId}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            toast({
                title: 'Link Copied!',
                description: 'The shareable link has been copied to your clipboard.',
            });
        }).catch(err => {
            console.error('Failed to copy link: ', err);
            toast({
                variant: 'destructive',
                title: 'Failed to Copy',
                description: 'Could not copy the link to your clipboard.',
            });
        });
    };

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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                     <Button className="w-full" variant="outline" onClick={handleShare}>
                        <Share2 className="mr-2 h-4 w-4" /> Share
                    </Button>
                    <Button className="w-full" onClick={() => handleDownload('jpg')}>
                        <FileImage className="mr-2 h-4 w-4" /> Download JPG
                    </Button>
                    <Button className="w-full" onClick={() => handleDownload('pdf')}>
                        <FileText className="mr-2 h-4 w-4" /> Download PDF
                    </Button>
                </div>
            </Card>
        </div>
    )
}
