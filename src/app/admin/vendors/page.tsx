
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
} from '@/components/ui/card';
import { useCollection, useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Vendor } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { VendorDetailsDialog } from '@/components/admin/vendor-details-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';


export default function AdminVendorsPage() {
  const firestore = useFirestore();
  const vendorsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'vendors') : null, [firestore]);
  const { data: vendors, isLoading } = useCollection<Vendor>(vendorsCollection);
  const { toast } = useToast();

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
    let actionPromise;
    let toastMessage = '';

    if (dialogState.action === 'delete') {
      actionPromise = deleteDocumentNonBlocking(vendorRef);
      toastMessage = `Vendor "${dialogState.companyName}" has been deleted.`;
    } else {
      actionPromise = updateDocumentNonBlocking(vendorRef, { status: dialogState.action });
      toastMessage = `Vendor "${dialogState.companyName}" has been ${dialogState.action}.`;
    }
    
    actionPromise; // This is a non-blocking call

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
