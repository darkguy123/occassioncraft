
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Vendor } from '@/lib/types';

interface VendorPendingStatusProps {
    status: 'pending' | 'rejected';
    vendorData: Vendor | null;
}

const REVIEW_PERIOD_HOURS = 12;

export function VendorPendingStatus({ status, vendorData }: VendorPendingStatusProps) {
    const [progress, setProgress] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState('');

    useEffect(() => {
        if (status === 'pending' && vendorData?.createdAt) {
            const createdAt = new Date(vendorData.createdAt).getTime();
            const approvalTime = createdAt + REVIEW_PERIOD_HOURS * 60 * 60 * 1000;

            const interval = setInterval(() => {
                const now = new Date().getTime();
                const totalDuration = approvalTime - createdAt;
                const elapsedTime = now - createdAt;
                
                const calculatedProgress = Math.min(100, (elapsedTime / totalDuration) * 100);
                setProgress(calculatedProgress);

                if (now >= approvalTime) {
                    setTimeRemaining("Your application should be approved shortly. Refresh this page.");
                    clearInterval(interval);
                } else {
                    const remainingMillis = approvalTime - now;
                    const hours = Math.floor(remainingMillis / (1000 * 60 * 60));
                    const minutes = Math.floor((remainingMillis % (1000 * 60 * 60)) / (1000 * 60));
                    setTimeRemaining(`${hours}h ${minutes}m remaining`);
                }
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [status, vendorData]);

    if (status === 'rejected') {
        return (
             <div className="flex flex-col items-center justify-center min-h-screen bg-secondary p-4 text-center">
                <Card className="max-w-md">
                    <CardHeader>
                        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                        <CardTitle className="mt-4 text-2xl">Application Rejected</CardTitle>
                        <CardDescription>
                            We're sorry, but your vendor application was not approved at this time. Please contact support if you believe this is an error.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/">Go to Homepage</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Pending Status UI
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-secondary p-4 text-center">
            <Card className="max-w-md w-full">
                <CardHeader>
                    <Clock className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle className="mt-4 text-2xl">Application In Review</CardTitle>
                    <CardDescription>
                       Thanks for your patience! Your application is being processed. The review period is typically around 12 hours.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Progress value={progress} className="w-full animated-progress" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Application Submitted</span>
                            <span>{timeRemaining}</span>
                        </div>
                    </div>
                     <div className="flex items-center justify-center gap-4 pt-4">
                        <Button asChild variant="outline">
                            <Link href="/">Go to Homepage</Link>
                        </Button>
                         <Button onClick={() => window.location.reload()}>
                            <RefreshCw className="mr-2 h-4 w-4"/>
                            Refresh Status
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

