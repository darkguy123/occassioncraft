'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { Vendor } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { VendorDetailsDialog } from '@/components/admin/vendor-details-dialog';
import Link from 'next/link';

export default function AdminVendorsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  const vendorsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'vendors'));
  }, [firestore]);

  const { data: vendors, isLoading } = useCollection<Vendor>(vendorsQuery);

  const handleUpdateStatus = (vendorId: string, companyName: string, status: 'approved' | 'rejected') => {
    if (!firestore) return;
    const vendorRef = doc(firestore, 'vendors', vendorId);
    updateDocumentNonBlocking(vendorRef, { status });
    toast({
      title: `Vendor ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      description: `${companyName} has been ${status}.`,
    });
    setSelectedVendor(null); // Close dialog on action
  };

  const handleDeleteVendor = (vendorId: string, companyName: string) => {
    if (!firestore) return;
    if (confirm(`Are you sure you want to delete ${companyName}? This action cannot be undone.`)) {
      const vendorRef = doc(firestore, 'vendors', vendorId);
      deleteDocumentNonBlocking(vendorRef);
      toast({
        variant: 'destructive',
        title: 'Vendor Deleted',
        description: `${companyName} has been permanently deleted.`,
      });
      setSelectedVendor(null); // Close dialog on action
    }
  };

  const getBadgeVariant = (status?: 'approved' | 'pending' | 'rejected') => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <>
      {selectedVendor && (
        <VendorDetailsDialog
          vendor={selectedVendor}
          isOpen={!!selectedVendor}
          onClose={() => setSelectedVendor(null)}
          onUpdateStatus={handleUpdateStatus}
          onDelete={handleDeleteVendor}
          getBadgeVariant={getBadgeVariant}
        />
      )}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Contact Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={4}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {vendors && vendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell>
                      <div className="font-medium">{vendor.companyName}</div>
                    </TableCell>
                    <TableCell>{vendor.contactEmail}</TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(vendor.status)}>
                        {vendor.status ? vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1) : 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedVendor(vendor)}>
                            View Details
                          </DropdownMenuItem>
                           <DropdownMenuItem asChild>
                            <Link href={`/admin/vendors/${vendor.id}/edit`}>Edit Vendor</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteVendor(vendor.id, vendor.companyName)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!isLoading && vendors?.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No vendors found.</p>
              )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
