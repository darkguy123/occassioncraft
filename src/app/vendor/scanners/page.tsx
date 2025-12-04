
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Trash2 } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import type { Vendor, User as UserType } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function VendorScannersPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  
  const [newScannerId, setNewScannerId] = useState('');

  const vendorDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'vendors', user.uid);
  }, [firestore, user]);

  const { data: vendorData, isLoading: isVendorLoading } = useDoc<Vendor>(vendorDocRef);

  const handleAddScanner = async () => {
    if (!newScannerId.trim() || !vendorDocRef || !firestore || !user) return;
    const scannerUid = newScannerId.trim();

    // 1. Add to vendor's authorizedScanners array
    updateDocumentNonBlocking(vendorDocRef, {
      authorizedScanners: arrayUnion(scannerUid)
    });

    // 2. Add 'scanner' role to the user's document
    const userRef = doc(firestore, 'users', scannerUid);
    try {
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
            const userData = userDoc.data() as UserType;
            const updatedRoles = [...new Set([...(userData.roles || []), 'scanner'])];
            updateDocumentNonBlocking(userRef, { roles: updatedRoles });
        } else {
            toast({ variant: 'destructive', title: 'User Not Found', description: `Could not find a user with ID: ${scannerUid}` });
            // Rollback the change on the vendor if user doesn't exist
            updateDocumentNonBlocking(vendorDocRef, { authorizedScanners: arrayRemove(scannerUid) });
            return;
        }
    } catch (error) {
        console.error("Error adding scanner role:", error);
        updateDocumentNonBlocking(vendorDocRef, { authorizedScanners: arrayRemove(scannerUid) });
        toast({ variant: 'destructive', title: 'Error', description: `Failed to update user role.` });
        return;
    }
    
    toast({ title: "Scanner Added", description: "The user can now scan tickets for your events." });
    setNewScannerId('');
  };

  const handleRemoveScanner = (scannerId: string) => {
    if (!vendorDocRef) return;
    // We can leave the 'scanner' role on the user document, as they might be a scanner for other vendors.
    // Access control should ultimately be handled on a per-event basis if needed, by checking
    // if the scanner ID is in the specific event's OR the vendor's authorized list.
    updateDocumentNonBlocking(vendorDocRef, {
      authorizedScanners: arrayRemove(scannerId)
    });
    toast({ title: "Scanner Removed" });
  };
  
  if (isVendorLoading) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="space-y-2">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-5 w-2/3" />
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-40 w-full" />
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Manage Scanners</h1>
        <p className="text-muted-foreground">Authorize users to scan tickets for any of your events.</p>
      </div>

       <Alert>
        <AlertTitle>How it Works</AlertTitle>
        <AlertDescription>
          Adding a user here grants them the 'scanner' role and authorizes them to validate tickets for <span className="font-semibold">all</span> of your events. For event-specific scanners, use the edit page for that particular event.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Invite New Scanner</CardTitle>
          <CardDescription>Add a user by their unique User ID to grant them scanning permissions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter User ID to add scanner"
              value={newScannerId}
              onChange={(e) => setNewScannerId(e.target.value)}
            />
            <Button onClick={handleAddScanner} disabled={!newScannerId.trim()}>
                <UserPlus className="mr-2 h-4 w-4" /> Add Scanner
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Authorized Scanners</CardTitle>
          <CardDescription>This is a list of users who can scan tickets for any of your events.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {vendorData?.authorizedScanners && vendorData.authorizedScanners.length > 0 ? (
              <ul className="divide-y rounded-md border">
                {vendorData.authorizedScanners.map(id => (
                  <li key={id} className="flex items-center justify-between p-3">
                    <span className="font-mono text-sm">{id}</span>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveScanner(id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Remove scanner</span>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No general scanners have been authorized yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
