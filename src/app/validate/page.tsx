
'use client';

import { Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, AlertTriangle, Loader2, CameraOff, Search, UserPlus } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, increment } from 'firebase/firestore';
import type { Event, Ticket, User } from '@/lib/types';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';


declare global {
    interface Window {
        BarcodeDetector: any;
    }
}

type ValidationStatus = 'idle' | 'scanning' | 'loading' | 'success' | 'error' | 'unsupported';
type ScanResult = {
    status: 'success' | 'error';
    message: string;
    details?: {
        eventName: string;
        attendeeName: string;
        attendeeAvatarUrl?: string;
        purchaseDate: string;
    };
};

function TicketValidator() {
    const { toast } = useToast();
    const { user: scannerUser } = useUser();
    const firestore = useFirestore();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
    const [scannedData, setScannedData] = useState<string | null>(null);
    const [manualTicketId, setManualTicketId] = useState('');

    const getScannerInvitationLink = () => {
        if (!scannerUser) return;
        const link = `${window.location.origin}/validate?scannerId=${scannerUser.uid}`;
        navigator.clipboard.writeText(link);
        toast({
            title: "Invitation Link Copied!",
            description: "Share this link with anyone you want to authorize as a ticket scanner."
        });
    }

    const validateTicketById = async (ticketId: string) => {
        setValidationStatus('loading');
        if (!firestore) {
             setScanResult({ status: 'error', message: 'Database connection not available.' });
             setValidationStatus('error');
             return;
        }

        try {
            const ticketRef = doc(firestore, 'tickets', ticketId);
            const ticketSnap = await getDoc(ticketRef);

            if (!ticketSnap.exists()) {
                setScanResult({ status: 'error', message: 'Ticket ID not found.' });
                setValidationStatus('error');
                return;
            }

            const ticket = ticketSnap.data() as Ticket;
            
            await processValidation(ticketId, ticket.eventId, ticket.userId);

        } catch (error: any) {
            console.error("Validation Error:", error);
            setScanResult({ status: 'error', message: error.message || 'An unexpected error occurred during validation.' });
            setValidationStatus('error');
        }
    }
    
    const processValidation = async (ticketId: string, eventId: string, userId: string) => {
        if (!firestore) return;

        const ticketRef = doc(firestore, `tickets`, ticketId);
        const eventRef = doc(firestore, 'events', eventId);
        const userRef = doc(firestore, 'users', userId);

        const [ticketSnap, eventSnap, userSnap] = await Promise.all([
            getDoc(ticketRef),
            getDoc(eventRef),
            getDoc(userRef)
        ]);

        if (!ticketSnap.exists()) {
            setScanResult({ status: 'error', message: 'Ticket not found.' });
            setValidationStatus('error');
            return;
        }

        if (!eventSnap.exists()) {
            setScanResult({ status: 'error', message: 'Event associated with this ticket not found.' });
            setValidationStatus('error');
            return;
        }
         if (!userSnap.exists()) {
            setScanResult({ status: 'error', message: 'User associated with this ticket not found.' });
            setValidationStatus('error');
            return;
        }

        const ticket = ticketSnap.data() as Ticket;
        const event = eventSnap.data() as Event;
        const user = userSnap.data() as User;
        
        // Check if the scanner is authorized
        const searchParams = new URLSearchParams(window.location.search);
        const scannerIdFromUrl = searchParams.get('scannerId');
        const authorizedScanners = [event.vendorId, ...(event.authorizedScanners || [])];
        const currentScannerId = scannerIdFromUrl || scannerUser?.uid;

        if (!currentScannerId || !authorizedScanners.includes(currentScannerId)) {
            setScanResult({ status: 'error', message: `You are not an authorized scanner for the event "${event.name}".` });
            setValidationStatus('error');
            return;
        }

        if (ticket.eventId !== eventId) {
            setScanResult({ status: 'error', message: `This ticket is not for this event. It is for "${event.name}".` });
            setValidationStatus('error');
            return;
        }
        
        if (ticket.scans >= ticket.maxScans) {
            setScanResult({ status: 'error', message: `This ticket has already been scanned ${ticket.scans} time(s) (max: ${ticket.maxScans}).` });
            setValidationStatus('error');
            return;
        }

        // All checks passed, ticket is valid.
        await updateDoc(ticketRef, { scans: increment(1) });

        setScanResult({
            status: 'success',
            message: 'Ticket is valid. Welcome!',
            details: {
                eventName: event.name,
                attendeeName: ticket.attendeeName || `${user.firstName} ${user.lastName}`,
                attendeeAvatarUrl: user.profileImageUrl,
                purchaseDate: format(new Date(ticket.purchaseDate), "PPP"),
            }
        });
        setValidationStatus('success');
    }

    const validateTicketFromUrl = async (url: string) => {
        setValidationStatus('loading');
        
        const { ticketId, eventId, userId } = parseValidationUrl(url);
        
        if (!ticketId || !eventId || !userId) {
            setScanResult({ status: 'error', message: 'Invalid QR Code. Does not contain valid ticket information.' });
            setValidationStatus('error');
            return;
        }
        
        await processValidation(ticketId, eventId, userId);
    };
    
    const parseValidationUrl = (url: string) => {
        try {
            const urlObj = new URL(url);
            const params = urlObj.searchParams;
            const ticketId = params.get('ticketId');
            const eventId = params.get('eventId');
            const userId = params.get('userId'); 
            return { ticketId, eventId, userId };
        } catch (e) {
            return { ticketId: null, eventId: null, userId: null };
        }
    };

    useEffect(() => {
        const getCameraPermission = async () => {
            if (typeof window.BarcodeDetector === 'undefined') {
                setValidationStatus('unsupported');
                toast({
                    variant: 'destructive',
                    title: 'Browser Not Supported',
                    description: 'Your browser does not support native QR code scanning.',
                });
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                setHasCameraPermission(true);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().then(() => {
                         setValidationStatus('scanning');
                    });
                }
            } catch (err) {
                console.error("Camera permission error:", err);
                setHasCameraPermission(false);
                toast({
                    variant: 'destructive',
                    title: 'Camera Access Denied',
                    description: 'Please enable camera permissions in your browser settings to use this app.',
                });
            }
        };

        getCameraPermission();

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        let animationFrameId: number;
        let barcodeDetector: any;

        if (validationStatus === 'scanning' && videoRef.current) {
            try {
                barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
            } catch (e) {
                setValidationStatus('unsupported');
                toast({
                    variant: 'destructive',
                    title: 'Scanner Initialization Failed',
                    description: 'Could not start the QR code scanner.',
                });
                return;
            }

            const detect = async () => {
                if (
                    videoRef.current &&
                    !videoRef.current.paused &&
                    videoRef.current.readyState >= videoRef.current.HAVE_ENOUGH_DATA &&
                    videoRef.current.videoWidth > 0 &&
                    validationStatus === 'scanning'
                ) {
                    try {
                        const barcodes = await barcodeDetector.detect(videoRef.current);
                        if (barcodes.length > 0 && !scannedData) {
                            const scannedUrl = barcodes[0].rawValue;
                            setScannedData(scannedUrl);
                            validateTicketFromUrl(scannedUrl);
                        }
                    } catch (e) {
                        console.error('Barcode detection failed:', e);
                    }
                }
                if (validationStatus === 'scanning') {
                    animationFrameId = requestAnimationFrame(detect);
                }
            };
            detect();
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [validationStatus, scannedData, toast, validateTicketFromUrl]);
    
    const resetScanner = () => {
        setScanResult(null);
        setScannedData(null);
        setManualTicketId('');
        if (videoRef.current && videoRef.current.srcObject) {
            setValidationStatus('scanning');
        } else {
            setValidationStatus('idle');
        }
    }

    if (hasCameraPermission === null && validationStatus !== 'unsupported') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Requesting camera access...</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto max-w-2xl py-12 px-4">
            <Card>
                <CardHeader>
                    <CardTitle>Ticket Validator</CardTitle>
                    <CardDescription>Point your camera at a ticket's QR code or enter the Ticket ID below to validate it for event entry.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="aspect-video w-full bg-slate-900/80 rounded-lg overflow-hidden relative mb-4">
                         <video ref={videoRef} className="w-full aspect-video rounded-md" autoPlay muted playsInline />
                        
                        {(hasCameraPermission === false || validationStatus === 'unsupported') && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                                <Alert variant="destructive" className="max-w-md">
                                    <CameraOff className="h-4 w-4" />
                                    <AlertTitle>{validationStatus === 'unsupported' ? 'Browser Not Supported' : 'Camera Access Required'}</AlertTitle>
                                    <AlertDescription>
                                        {validationStatus === 'unsupported' 
                                            ? 'Sorry, your browser does not have the built-in capabilities for QR scanning.' 
                                            : 'This feature requires camera access to scan QR codes. Please enable it in your browser settings and refresh the page.'
                                        }
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}

                        {validationStatus === 'loading' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            </div>
                        )}
                        
                        {scanResult && (validationStatus === 'success' || validationStatus === 'error') && (
                             <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 p-4 text-center">
                                {scanResult.status === 'success' ? (
                                    <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                                ) : (
                                    <XCircle className="h-16 w-16 text-destructive mb-4" />
                                )}
                                <h3 className={`text-2xl font-bold ${scanResult.status === 'success' ? 'text-green-600' : 'text-destructive'}`}>{scanResult.message}</h3>
                                
                                {scanResult.details && (
                                    <Card className="mt-4 p-4 w-full max-w-sm">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-16 w-16">
                                                <AvatarImage src={scanResult.details.attendeeAvatarUrl} />
                                                <AvatarFallback>
                                                    {scanResult.details.attendeeName.split(' ').map(n => n[0]).join('')}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="text-left">
                                                <p className="font-bold">{scanResult.details.attendeeName}</p>
                                                <p className="text-sm text-muted-foreground">{scanResult.details.eventName}</p>
                                                <p className="text-xs text-muted-foreground">Purchased: {scanResult.details.purchaseDate}</p>
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                <Button onClick={resetScanner} className="mt-6">Scan Next Ticket</Button>
                            </div>
                        )}
                    </div>
                     <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Scanner Status</AlertTitle>
                        <AlertDescription>
                            {validationStatus === 'scanning' && 'Ready to scan. Please position the QR code within the frame.'}
                            {validationStatus === 'loading' && 'Validating ticket...'}
                            {validationStatus === 'success' && 'Validation complete.'}
                            {validationStatus === 'error' && 'Validation failed.'}
                             {validationStatus === 'unsupported' && 'Scanner not supported by this browser.'}
                        </AlertDescription>
                    </Alert>

                     <div className="mt-6 pt-6 border-t">
                        <form onSubmit={(e) => { e.preventDefault(); validateTicketById(manualTicketId); }} className="space-y-4">
                            <label className="font-medium">Or Enter Ticket ID Manually</label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Enter Ticket ID..."
                                    value={manualTicketId}
                                    onChange={(e) => setManualTicketId(e.target.value)}
                                    disabled={validationStatus === 'loading'}
                                />
                                <Button type="submit" disabled={!manualTicketId || validationStatus === 'loading'}>
                                    <Search className="mr-2 h-4 w-4" /> Validate
                                </Button>
                            </div>
                        </form>
                    </div>

                    <div className="mt-6 pt-6 border-t">
                        <h3 className="font-medium mb-2">Scanner Management</h3>
                        <p className="text-sm text-muted-foreground mb-4">Authorize others to scan tickets for your events by sharing a unique link.</p>
                        <Button variant="outline" onClick={getScannerInvitationLink} disabled={!scannerUser}>
                            <UserPlus className="mr-2 h-4 w-4" /> Copy Scanner Invitation Link
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


export default function ValidatePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <TicketValidator />
        </Suspense>
    )
}
