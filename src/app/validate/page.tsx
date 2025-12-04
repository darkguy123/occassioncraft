
'use client';

import { Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, AlertTriangle, Loader2, Camera, VideoOff, Zap, ZapOff } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import type { Event, Ticket, User } from '@/lib/types';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import jsQR from 'jsqr';
import { Input } from '@/components/ui/input';

type ValidationStatus = 'idle' | 'loading' | 'success' | 'error' | 'unauthorized';
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
    const { user: scannerUser, isUserLoading: isScannerLoading } = useUser();
    const firestore = useFirestore();
    
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
    const [authChecked, setAuthChecked] = useState(false);
    
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [manualTicketId, setManualTicketId] = useState('');

    // Flashlight state
    const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
    const [isTorchSupported, setIsTorchSupported] = useState(false);
    const [isTorchOn, setIsTorchOn] = useState(false);


    // Authorization check effect
    useEffect(() => {
        if (isScannerLoading) return;
        if (!scannerUser) {
            setValidationStatus('unauthorized');
        } else {
            setValidationStatus('idle');
        }
        setAuthChecked(true);
    }, [scannerUser, isScannerLoading]);
    
     // Get camera permission and start video stream
    useEffect(() => {
        if (validationStatus !== 'idle') return;

        const getCameraPermission = async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setHasCameraPermission(true);
            setVideoStream(stream);
    
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
             setIsScanning(true);
          } catch (error) {
            console.error('Error accessing camera:', error);
            setHasCameraPermission(false);
            toast({
              variant: 'destructive',
              title: 'Camera Access Denied',
              description: 'Please enable camera permissions in your browser settings to use this app.',
            });
          }
        };

        getCameraPermission();

        // Cleanup: stop video stream when component unmounts
        return () => {
            if (videoStream) {
                videoStream.getTracks().forEach(track => track.stop());
            }
        }
    }, [validationStatus, toast]);

    // Check for torch support
    useEffect(() => {
        if (videoStream) {
            const track = videoStream.getVideoTracks()[0];
            if (track && 'getCapabilities' in track) {
                const capabilities = track.getCapabilities();
                // @ts-ignore - torch is a valid capability but not in all TS libs
                setIsTorchSupported(!!capabilities.torch);
            }
        }
    }, [videoStream]);

    const toggleTorch = useCallback(async () => {
        if (!videoStream || !isTorchSupported) return;

        const track = videoStream.getVideoTracks()[0];
        try {
            await track.applyConstraints({
                // @ts-ignore
                advanced: [{ torch: !isTorchOn }]
            });
            setIsTorchOn(!isTorchOn);
        } catch (error) {
            console.error('Failed to toggle torch:', error);
            toast({ variant: 'destructive', title: 'Torch Error', description: 'Could not control the flashlight.' });
        }
    }, [videoStream, isTorchOn, isTorchSupported, toast]);


    const scanQrCode = useCallback(() => {
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            if (ctx) {
                canvas.height = video.videoHeight;
                canvas.width = video.videoWidth;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: 'dontInvert',
                });

                if (code) {
                    setIsScanning(false);
                    const url = new URL(code.data);
                    const ticketId = url.searchParams.get('ticketId');
                    if (ticketId) {
                        validateTicketById(ticketId);
                    } else {
                        setScanResult({ status: 'error', message: 'Invalid QR code. No ticket ID found.' });
                        setValidationStatus('error');
                    }
                }
            }
        }
    }, []);

    useEffect(() => {
        let animationFrameId: number;
        if (isScanning && hasCameraPermission) {
            const tick = () => {
                scanQrCode();
                animationFrameId = requestAnimationFrame(tick);
            };
            animationFrameId = requestAnimationFrame(tick);
        }
        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [isScanning, hasCameraPermission, scanQrCode]);

    
    const validateTicketById = async (ticketId: string) => {
        if (!scannerUser) {
            setValidationStatus('unauthorized');
            return;
        }

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
            
            await processValidation(ticket, scannerUser);

        } catch (error: any) {
            console.error("Validation Error:", error);
            setScanResult({ status: 'error', message: error.message || 'An unexpected error occurred during validation.' });
            setValidationStatus('error');
        }
    }
    
    const processValidation = async (ticket: Ticket, scanner: User) => {
        if (!firestore) return;

        const ticketRef = doc(firestore, `tickets`, ticket.id);
        const eventRef = doc(firestore, 'events', ticket.eventId);
        const userRef = doc(firestore, 'users', ticket.userId);

        const [eventSnap, userSnap] = await Promise.all([
            getDoc(eventRef),
            getDoc(userRef)
        ]);

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

        const event = eventSnap.data() as Event;
        const ticketHolder = userSnap.data() as User;
        
        // --- SECURITY CHECK ---
        const authorizedScanners = [event.vendorId, ...(event.authorizedScanners || [])];
        if (!authorizedScanners.includes(scanner.uid)) {
            setScanResult({ status: 'error', message: `You are not an authorized scanner for the event "${event.name}".` });
            setValidationStatus('error');
            return;
        }
        // --- END SECURITY CHECK ---

        if (ticket.scans >= ticket.maxScans) {
            setScanResult({ status: 'error', message: `This ticket has already been scanned ${ticket.scans} time(s) (max: ${ticket.maxScans}).` });
            setValidationStatus('error');
            return;
        }

        // All checks passed, ticket is valid.
        await updateDoc(ticketRef, { 
            scans: increment(1),
            lastScannedAt: new Date().toISOString(),
        });

        setScanResult({
            status: 'success',
            message: 'Ticket is valid. Welcome!',
            details: {
                eventName: event.name,
                attendeeName: ticket.attendeeName || `${ticketHolder.firstName} ${ticketHolder.lastName}`,
                attendeeAvatarUrl: ticketHolder.profileImageUrl,
                purchaseDate: format(new Date(ticket.purchaseDate), "PPP"),
            }
        });
        setValidationStatus('success');
    }

    const resetScanner = () => {
        setScanResult(null);
        setValidationStatus('idle');
        setManualTicketId('');
        setIsScanning(true);
    }
    
    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedId = manualTicketId.trim();
        if (trimmedId) {
            validateTicketById(trimmedId);
        } else {
            toast({ variant: 'destructive', title: 'Invalid ID', description: 'Please enter a ticket ID.' });
        }
    }
    
    if (!authChecked) {
         return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Verifying scanner credentials...</p>
            </div>
        )
    }

    if (validationStatus === 'unauthorized') {
        return (
            <div className="container mx-auto max-w-2xl py-12 px-4">
                 <Card className="text-center">
                     <CardHeader>
                        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
                         <CardTitle>Authorization Required</CardTitle>
                         <CardDescription>
                            You must be logged in as an authorized scanner to use this page.
                         </CardDescription>
                     </CardHeader>
                     <CardContent>
                         <Button asChild><a href="/login">Login to Scan</a></Button>
                     </CardContent>
                 </Card>
            </div>
        )
    }


    return (
        <div className="container mx-auto max-w-2xl py-12 px-4 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Ticket Validator</CardTitle>
                    <CardDescription>Point your camera at a ticket's QR code to validate it.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {scanResult && (validationStatus === 'success' || validationStatus === 'error') ? (
                             <div className="flex flex-col items-center justify-center text-center p-4 rounded-lg bg-secondary">
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
                        ) : (
                             <div className="w-full aspect-square bg-black rounded-lg overflow-hidden relative flex items-center justify-center">
                                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                                <canvas ref={canvasRef} className="hidden" />

                                <div className="absolute inset-0 border-8 border-white/20 rounded-lg" style={{ clipPath: 'polygon(0% 0%, 0% 100%, 25% 100%, 25% 25%, 75% 25%, 75% 75%, 25% 75%, 25% 100%, 100% 100%, 100% 0%)' }} />

                                {validationStatus === 'loading' && <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white"><Loader2 className="h-10 w-10 animate-spin mb-2" />Validating...</div>}
                                
                                {isTorchSupported && (
                                     <Button
                                        size="icon"
                                        variant={isTorchOn ? "secondary" : "outline"}
                                        onClick={toggleTorch}
                                        className="absolute top-4 right-4 z-10"
                                     >
                                        {isTorchOn ? <ZapOff /> : <Zap />}
                                        <span className="sr-only">Toggle Flashlight</span>
                                     </Button>
                                )}

                                {hasCameraPermission === false && (
                                     <Alert variant="destructive" className="absolute bottom-4 left-4 right-4 w-auto z-10">
                                        <VideoOff className="h-4 w-4" />
                                        <AlertTitle>Camera Access Required</AlertTitle>
                                        <AlertDescription>
                                          Please allow camera access in your browser settings to use this feature.
                                        </AlertDescription>
                                    </Alert>
                                )}
                                {hasCameraPermission === null && !isScannerLoading && (
                                     <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                                        <Loader2 className="h-10 w-10 animate-spin mb-2" />
                                        <p>Requesting camera access...</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Manual Validation</CardTitle>
                    <CardDescription>If the camera isn't working, you can enter a ticket ID below.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
                        <Input
                            placeholder="Enter Ticket ID"
                            value={manualTicketId}
                            onChange={(e) => setManualTicketId(e.target.value)}
                            disabled={validationStatus === 'loading'}
                        />
                        <Button type="submit" disabled={!manualTicketId.trim() || validationStatus === 'loading'}>
                            {validationStatus === 'loading' ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Validate'}
                        </Button>
                    </form>
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

    