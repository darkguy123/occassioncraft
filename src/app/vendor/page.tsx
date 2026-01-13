
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function VendorPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/vendor/dashboard');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-secondary p-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirecting to your dashboard...</p>
    </div>
  );
}
