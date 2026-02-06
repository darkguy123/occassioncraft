'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableHead,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, arrayUnion, query, orderBy, getDocs, limit, startAfter, type QueryDocumentSnapshot } from 'firebase/firestore';
import type { Vendor } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState, useEffect, useCallback } from 'react';
import { VendorDetailsDialog } from '@/components/admin/vendor-details-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

const VENDORS_PER_PAGE = 15;

export default function AdminVendorsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  type DialogAction = 'approve' | 'reject' | 'delete';
  type DialogState = {
    isOpen: boolean;
    vendorId?: string;
    companyName?: string;
    action?: DialogAction;
  }
  const [dialogState, setDialogState] = useState<DialogState>({ isOpen: false });
  
  const fetchVendors = useCallback(async () => {
    if (!firestore) return;
    setIsLoading(true);
    try {
        const first = query(collection(firestore, 'vendors'), orderBy('createdAt', 'desc'), limit(VENDORS_PER_PAGE));
        const documentSnapshots = await getDocs(first);

        const newVendors = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor));
        setVendors(newVendors);

        const lastDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1];
        setLastVisible(lastDoc);

        if (documentSnapshots.empty || documentSnapshots.size < VENDORS_PER_PAGE) {
            setHasMore(false);
        } else {
            setHasMore(true);
        }
    } catch (error) {
        console.error("Error fetching vendors:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch vendors.' });
    } finally {
        setIsLoading(false);
    }
  }, [firestore, toast]);
    
  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const loadMoreVendors = async () => {
    if (!firestore || !lastVisible || !hasMore) return;
    setIsLoadingMore(true);
    try {
        const next = query(collection(firestore, 'vendors'), orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(VENDORS_PER_PAGE));
        const documentSnapshots = await getDocs(next);

        if (documentSnapshots.empty) {
            setHasMore(false);
            return;
        }

        const newVendors = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor));
        setVendors(prevVendors => [...prevVendors, ...newVendors]);

        const lastDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1];
        setLastVisible(lastDoc);
        
        if (documentSnapshots.size < VENDORS_PER_PAGE) {
            setHasMore(false);
        }
    } catch (error) {
         console.error("Error fetching more vendors:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load more vendors.' });
    } finally {
        setIsLoadingMore(false);
    }
  };

  const getBadgeVariant = (status?: 'approved' | 'pending' | 'rejected') => {
    switch (status) {
        case 'approved': return 'secondary';
        case 'pending': return 'outline';
        case 'rejected': return 'destructive';
        default: return 'default';
    }
  }

  const handleOpenDetails = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsDetailsOpen(true);
  }

  const handleUpdateStatus = (vendorId: string, companyName: string, status: 'approved' | 'rejected') => {
    setDialogState({ isOpen: true, vendorId, companyName, action: status });
    setIsDetailsOpen(false); // Close details dialog if open
  }

  const handleDelete = (vendorId: string, companyName: string) => {
    setDialogState({ isOpen: true, vendorId, companyName, action: 'delete' });
    setIsDetailsOpen(false); // Close details dialog if open
  }
  
  const confirmAction = () => {
    if (!dialogState.vendorId || !dialogState.action || !firestore) return;

    const vendorRef = doc(firestore, 'vendors', dialogState.vendorId);
    let toastMessage = '';

    if (dialogState.action === 'delete') {
      deleteDocumentNonBlocking(vendorRef);
      setVendors(v => v.filter(vendor => vendor.id !== dialogState.vendorId));
      toastMessage = `Vendor "${dialogState.companyName}" has been deleted.`;
    } else {
      // Approve or Reject
      updateDocumentNonBlocking(vendorRef, { status: dialogState.action });
       setVendors(v => v.map(vendor => vendor.id === dialogState.vendorId ? { ...vendor, status: dialogState.action as 'approved' | 'rejected' } : vendor));
      toastMessage = `Vendor "${dialogState.companyName}" has been ${dialogState.action}.`;
      
      // If approving, also update the user's roles
      if (dialogState.action === 'approve') {
        const userRef = doc(firestore, 'users', dialogState.vendorId);
        updateDocumentNonBlocking(userRef, { roles: arrayUnion('vendor') });
      }
    }
    
    toast({
      title: "Action Successful",
      description: toastMessage,
    });

    setDialogState({ isOpen: false });
  }

  const dialogContent = {
      approve: { title: "Approve Vendor", description: "This will grant them full access to create and manage events. Are you sure?" },
      reject: { title: "Reject Vendor", description: "This will prevent them from accessing vendor features. Are you sure?" },
      delete: { title: "Delete Vendor", description: "This action cannot be undone. This will permanently delete the vendor and all their associated data. Are you sure?" }
  }
  const currentDialog = dialogState.action ? dialogContent[dialogState.action] : null;


  return (
      <>
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
                <p className="text-muted-foreground">Manage vendor applications and profiles.</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Vendors</CardTitle>
              <CardDescription>
                A list of all vendors on the platform and their application status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Contact Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                          <TableCell><Skeleton className="h-5 w-32"/></TableCell>
                          <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-40"/></TableCell>
                          <TableCell><Skeleton className="h-5 w-20"/></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto"/></TableCell>
                      </TableRow>
                    ))}
                    {!isLoading && vendors?.map((vendor) => (
                      <TableRow key={vendor.id}>
                          <TableCell className="font-medium">{vendor.companyName}</TableCell>
                          <TableCell className="hidden sm:table-cell">{vendor.contactEmail}</TableCell>
                          <TableCell>
                              <Badge variant={getBadgeVariant(vendor.status)}>
                                  {vendor.status ? vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1) : 'N/A'}
                              </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleOpenDetails(vendor)}>
                                      <Eye className="mr-2 h-4 w-4" /> View Details
                                  </DropdownMenuItem>
                                  {vendor.status === 'pending' && (
                                      <>
                                          <DropdownMenuItem onClick={() => handleUpdateStatus(vendor.id, vendor.companyName, 'approved')}>Approve</DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleUpdateStatus(vendor.id, vendor.companyName, 'rejected')}>Reject</DropdownMenuItem>
                                      </>
                                  )}
                                  <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(vendor.id, vendor.companyName)}>Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                          </TableCell>
                      </TableRow>
                    ))}
                    {!isLoading && vendors?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                            No vendors found.
                          </TableCell>
                        </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            {hasMore && (
                <CardFooter>
                    <Button onClick={loadMoreVendors} disabled={isLoadingMore} className="w-full">
                        {isLoadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Load More
                    </Button>
                </CardFooter>
            )}
          </Card>
        </div>

        {selectedVendor && (
          <VendorDetailsDialog 
            vendor={selectedVendor} 
            isOpen={isDetailsOpen} 
            onClose={() => setIsDetailsOpen(false)}
            onUpdateStatus={handleUpdateStatus}
            onDelete={handleDelete}
            getBadgeVariant={getBadgeVariant}
          />
        )}
        
        <AlertDialog open={dialogState.isOpen} onOpenChange={(open) => setDialogState({ isOpen: open })}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{currentDialog?.title}</AlertDialogTitle>
                    <AlertDialogDescription>{currentDialog?.description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={confirmAction}
                      className={dialogState.action === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}
                    >
                      Confirm
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </>
  );
}
