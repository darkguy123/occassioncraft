
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';

interface VendorStatusPageProps {
  status: 'pending' | 'rejected';
}

export function VendorStatusPage({ status }: VendorStatusPageProps) {
  // The 'pending' state is now handled by a dialog in the layout.
  // This component is now only for the 'rejected' state.
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

  // A fallback for the pending case, though it shouldn't be called from the layout anymore.
  if (status === 'pending') {
    return (
       <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  return null;
}
