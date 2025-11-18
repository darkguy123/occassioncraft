
'use client';

import { Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, AlertTriangle, Loader2, CameraOff } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { Event, UserTicket, User } from '@/lib/types';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


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
    const firestore = useFirestore();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
    const [scannedData, setScannedData] = useState<string | null>(null);

    const validateTicket = async (url: string) => {
        setValidationStatus('loading');
        if (!firestore) {
             setScanResult({ status: 'error', message: 'Database connection not available.' });
             setValidationStatus('error');
             return;
        }

        try {
            const { ticketId, eventId, userId } = parseValidationUrl(url);
            
            if (!ticketId || !eventId || !userId) {
                setScanResult({ status: 'error', message: 'Invalid QR Code. Does not contain valid ticket information.' });
                setValidationStatus('error');
                return;
            }

            const ticketRef = doc(firestore, `users/${userId}/tickets`, ticketId);
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
                setScanResult({ status: 'error', message: 'Event not found.' });
                setValidationStatus('error');
                return;
            }
             if (!userSnap.exists()) {
                setScanResult({ status: 'error', message: 'User not found.' });
                setValidationStatus('error');
                return;
            }

            const ticket = ticketSnap.data() as UserTicket;
            const event = eventSnap.data() as Event;
            const user = userSnap.data() as User;

            if (ticket.eventId !== eventId) {
                setScanResult({ status: 'error', message: `This ticket is not for this event. It is for "${event.name}".` });
                setValidationStatus('error');
                return;
            }
            
            if (ticket.isUsed) {
                setScanResult({ status: 'error', message: 'This ticket has already been used.' });
                setValidationStatus('error');
                return;
            }

            // All checks passed, ticket is valid.
            // In a real scenario, you might want to uncomment this line.
            // await updateDoc(ticketRef, { isUsed: true });

            setScanResult({
                status: 'success',
                message: 'Ticket is valid. Welcome!',
                details: {
                    eventName: event.name,
                    attendeeName: `${user.firstName} ${user.lastName}`,
                    attendeeAvatarUrl: user.profileImageUrl,
                    purchaseDate: format(new Date(ticket.purchaseDate), "PPP"),
                }
            });
            setValidationStatus('success');

        } catch (error: any) {
            console.error("Validation Error:", error);
            setScanResult({ status: 'error', message: error.message || 'An unexpected error occurred during validation.' });
            setValidationStatus('error');
        }
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
        let stream: MediaStream | null = null;
        let animationFrameId: number;

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
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                setHasCameraPermission(true);
                setValidationStatus('scanning');
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
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

        return () => {
            cancelAnimationFrame(animationFrameId);
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
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
                if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && validationStatus === 'scanning') {
                    try {
                        const barcodes = await barcodeDetector.detect(videoRef.current);
                        if (barcodes.length > 0 && !scannedData) {
                            const scannedUrl = barcodes[0].rawValue;
                            setScannedData(scannedUrl);
                            validateTicket(scannedUrl);
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
    }, [validationStatus, scannedData]);
    
    const resetScanner = () => {
        setScanResult(null);
        setScannedData(null);
        setValidationStatus('scanning');
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
                    <CardDescription>Point your camera at a ticket's QR code to validate it for event entry.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="aspect-video w-full bg-slate-900/80 rounded-lg overflow-hidden relative mb-6">
                        <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                        
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
