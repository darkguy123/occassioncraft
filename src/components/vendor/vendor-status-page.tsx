
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';

interface VendorStatusPageProps {
  status: 'pending' | 'rejected';
}

export function VendorStatusPage({ status }: VendorStatusPageProps) {
  if (status === 'pending') {
    return (
      <div className="flex flex-1 items-center justify-center p-4 bg-muted/30 min-h-screen">
        <Card className="max-w-md text-center">
          <CardHeader>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <CardTitle className="mt-4">Application Pending</CardTitle>
            <CardDescription>
              Your vendor application is currently under review by our team.
              You will receive a notification once it has been approved.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This usually takes 1-2 business days. If you have any questions, feel free to{' '}
              <Link href="/help-center" className="underline text-primary">
                contact us
              </Link>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="flex flex-1 items-center justify-center p-4 bg-muted/30 min-h-screen">
        <Card className="max-w-md text-center border-destructive">
          <CardHeader>
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle className="mt-4">Application Not Approved</CardTitle>
            <CardDescription>
              We're sorry, but your application to become a vendor was not approved at this time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              For more information or to appeal this decision, please{' '}
              <Link href="/help-center" className="underline text-primary">
                contact our support team
              </Link>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
