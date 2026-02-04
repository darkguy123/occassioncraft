'use client';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface VendorPendingDialogProps {
  isOpen: boolean;
}

export function VendorPendingDialog({ isOpen }: VendorPendingDialogProps) {
  const router = useRouter();

  const handleGoBack = () => {
    router.push('/dashboard');
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader className="text-center items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <AlertDialogTitle className="mt-4 text-2xl">
            Application Pending
          </AlertDialogTitle>
          <AlertDialogDescription>
            Your vendor application is currently under review. You will have
            access to this page once your application is approved.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button onClick={handleGoBack} className="w-full">
            Go Back to Dashboard
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
