'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Vendor } from '@/lib/types';
import { CheckCircle, XCircle, Trash2, Edit, Mail, Info } from 'lucide-react';
import Link from 'next/link';

interface VendorDetailsDialogProps {
  vendor: Vendor;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (vendorId: string, companyName: string, status: 'approved' | 'rejected') => void;
  onDelete: (vendorId: string, companyName: string) => void;
  getBadgeVariant: (status?: 'approved' | 'pending' | 'rejected') => "default" | "secondary" | "destructive" | "outline" | null | undefined;
}

export function VendorDetailsDialog({
  vendor,
  isOpen,
  onClose,
  onUpdateStatus,
  onDelete,
  getBadgeVariant,
}: VendorDetailsDialogProps) {
  if (!vendor) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{vendor.companyName}</DialogTitle>
          <DialogDescription>Vendor ID: {vendor.id}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
            <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={getBadgeVariant(vendor.status)}>
                    {vendor.status ? vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1) : 'N/A'}
                </Badge>
            </div>
            <Separator />
            <div className="flex items-start gap-4">
                <Mail className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                    <p className="font-semibold">Contact Email</p>
                    <a href={`mailto:${vendor.contactEmail}`} className="text-primary hover:underline">{vendor.contactEmail}</a>
                </div>
            </div>
            <div className="flex items-start gap-4">
                <Info className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                    <p className="font-semibold">Description</p>
                    <p className="text-muted-foreground text-sm">{vendor.description || 'No description provided.'}</p>
                </div>
            </div>
        </div>
        
        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between w-full">
            <div>
                 <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/vendors/${vendor.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                    </Link>
                </Button>
            </div>
            <div className="flex justify-end gap-2">
            {vendor.status === 'pending' && (
                <>
                    <Button variant="outline" size="sm" className="text-red-500 border-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => onUpdateStatus(vendor.id, vendor.companyName, 'rejected')}>
                        <XCircle className="mr-2 h-4 w-4" /> Reject
                    </Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onUpdateStatus(vendor.id, vendor.companyName, 'approved')}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Approve
                    </Button>
                </>
            )}
            <Button variant="destructive" size="sm" onClick={() => onDelete(vendor.id, vendor.companyName)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
