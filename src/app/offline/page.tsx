'use client';

import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <WifiOff className="h-16 w-16 text-muted-foreground mb-4" />
      <h1 className="text-3xl font-bold font-headline">You're Offline</h1>
      <p className="mt-2 text-muted-foreground max-w-sm">
        It looks like you've lost your internet connection. Some features may not be available until you reconnect.
      </p>
      <Button onClick={() => window.location.reload()} className="mt-6">
        Try Reloading
      </Button>
    </div>
  );
}
