'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Event, Ticket } from '@/lib/types';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, Download, FileImage, FileText, Share2, ScanLine, Clock, ArrowLeft } from 'lucide-react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { toJpeg, toPdf } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { TicketDesign } from '@/components/ticket-design';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import Link from 'next/link';

export default function VendorTicketDetailsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { eventId, ticketId } = params;

    const [qrCodeUrl, setQrCodeUrl] = useState('');

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

    const handleDownload = useCallback((formatType: 'jpg' | 'pdf') => {
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

        toast({ title: 'Preparing Download...', description: `Your ticket will be downloaded as a ${formatType.toUpperCase()} file.` });
        
        toJpeg(node, imageOptions)
            .then((dataUrl) => {
                const link = document.createElement('a');
                if (formatType === 'jpg') {
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
            })
            .catch((err) => console.error('Download failed', err));

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
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <Skeleton className="h-8 w-40" />
                <div className="grid md:grid-cols-2 gap-8">
                     <Skeleton className="h-[600px] w-full rounded-2xl" />
                     <Skeleton className="h-64 w-full rounded-lg" />
                </div>
            </div>
        );
    }
    
    if (!ticketData || !eventData) {
        return (
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                 <Card className="p-8 text-center bg-destructive/10 border-destructive">
                    <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-destructive-foreground">Ticket or Event Not Found</h2>
                 </Card>
            </div>
        )
    }
    
    const isVendor = eventData.vendorId === user?.uid;

    if (!isVendor) {
         return (
             <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                 <Card className="p-8 text-center bg-destructive/10 border-destructive">
                    <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-destructive-foreground">Access Denied</h2>
                    <p className="text-destructive-foreground/80 mt-2">
                        You do not have permission to view this ticket's details.
                    </p>
                 </Card>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
             <Button variant="ghost" asChild>
                <Link href={`/vendor/events/${eventId}/report`}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Ticket List</Link>
            </Button>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 flex items-center justify-center">
                    <TicketDesign eventData={eventData} ticketData={ticketData} qrCodeUrl={qrCodeUrl} user={null} />
                </div>
                <div className="space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-2">
                             <Button className="w-full" variant="outline" onClick={handleShare}>
                                <Share2 className="mr-2 h-4 w-4" /> Share
                            </Button>
                            <Button className="w-full" onClick={() => handleDownload('jpg')}>
                                <FileImage className="mr-2 h-4 w-4" /> JPG
                            </Button>
                            <Button className="w-full" onClick={() => handleDownload('pdf')}>
                                <FileText className="mr-2 h-4 w-4" /> PDF
                            </Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><ScanLine /> Scan History</CardTitle>
                            <CardDescription>Status of this ticket's validation.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                           <div className="flex justify-between items-center text-lg">
                                <span className="font-medium">Total Scans:</span>
                                <span className="font-bold">{ticketData.scans} / {ticketData.maxScans}</span>
                           </div>
                           {ticketData.scans > 0 && ticketData.lastScannedAt ? (
                             <div className="flex items-center text-sm text-muted-foreground border-t pt-3">
                                <Clock className="mr-2 h-4 w-4" />
                                <div>
                                    <p>Last scanned on:</p>
                                    <p className="font-semibold text-foreground">{format(new Date(ticketData.lastScannedAt), 'PPP p')}</p>
                                </div>
                             </div>
                           ) : (
                             <p className="text-sm text-muted-foreground text-center pt-3 border-t">This ticket has not been scanned yet.</p>
                           )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
