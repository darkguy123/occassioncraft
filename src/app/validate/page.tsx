
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, AlertTriangle, Loader2, Search } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import type { Event, Ticket, User } from '@/lib/types';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
    const searchParams = useSearchParams();

    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
    const [manualTicketId, setManualTicketId] = useState('');
    const [authChecked, setAuthChecked] = useState(false);
    
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
        setManualTicketId('');
        setValidationStatus('idle');
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
        <div className="container mx-auto max-w-2xl py-12 px-4">
            <Card>
                <CardHeader>
                    <CardTitle>Ticket Validator</CardTitle>
                    <CardDescription>Enter a Ticket ID below to validate it for event entry.</CardDescription>
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
                             <form onSubmit={(e) => { e.preventDefault(); validateTicketById(manualTicketId); }} className="space-y-4">
                                <div>
                                    <label htmlFor="ticket-id" className="font-medium sr-only">Ticket ID</label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="ticket-id"
                                            placeholder="Enter Ticket ID to validate..."
                                            value={manualTicketId}
                                            onChange={(e) => setManualTicketId(e.target.value)}
                                            disabled={validationStatus === 'loading'}
                                        />
                                        <Button type="submit" disabled={!manualTicketId || validationStatus === 'loading'} className="w-40">
                                            {validationStatus === 'loading' ? 
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
                                                <Search className="mr-2 h-4 w-4" />
                                            }
                                            Validate
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        )}
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
