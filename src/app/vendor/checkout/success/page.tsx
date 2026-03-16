'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, ArrowRight, BarChart2, Ticket, QrCode } from 'lucide-react';
import Link from 'next/link';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get('eventId');

  return (
    <div className="container max-w-2xl mx-auto py-20 px-4">
      <Card className="text-center p-8 border-2 border-green-100 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-green-500" />
        <CardHeader className="flex flex-col items-center gap-4">
          <div className="bg-green-100 p-4 rounded-full">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-3xl font-bold font-headline">Payment Successful!</CardTitle>
          <p className="text-muted-foreground">
            Your ticket category batch has been successfully published and generated.
          </p>
        </CardHeader>
        <CardContent className="py-6 space-y-6">
          <div className="bg-secondary/50 rounded-xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            <div className="flex items-start gap-3">
                <Ticket className="h-5 w-5 text-primary mt-0.5" />
                <div>
                    <p className="font-semibold text-sm">Tickets Ready</p>
                    <p className="text-xs text-muted-foreground">Your batch is now active and ready for sale or distribution.</p>
                </div>
            </div>
            <div className="flex items-start gap-3">
                <QrCode className="h-5 w-5 text-primary mt-0.5" />
                <div>
                    <p className="font-semibold text-sm">Validatable</p>
                    <p className="text-xs text-muted-foreground">Attendees can now use these tickets for secure entry.</p>
                </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
          {eventId ? (
            <Button className="w-full font-bold h-12" asChild>
              <Link href={`/vendor/events/${eventId}/report`}>
                <BarChart2 className="mr-2 h-5 w-5" />
                View Sales Report
              </Link>
            </Button>
          ) : (
            <Button className="w-full font-bold h-12" asChild>
              <Link href="/vendor/tickets">
                <Ticket className="mr-2 h-5 w-5" />
                View All Tickets
              </Link>
            </Button>
          )}
          <Button variant="outline" className="w-full font-bold h-12" asChild>
            <Link href="/vendor/dashboard">
              Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="container text-center py-20">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
