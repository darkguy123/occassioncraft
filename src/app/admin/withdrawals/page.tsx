'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, updateDoc, doc } from 'firebase/firestore';
import type { WithdrawalRequest } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Check, X, CreditCard } from 'lucide-react';

export default function AdminWithdrawalsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'paid' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const withdrawalsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'withdrawalRequests'));
  }, [firestore]);

  const { data: allWithdrawals, isLoading } = useCollection<WithdrawalRequest>(withdrawalsQuery);

  const withdrawalStats = useMemo(() => {
    const requests = allWithdrawals || [];
    const pending = requests.filter((r) => r.status === 'pending');
    const approved = requests.filter((r) => r.status === 'approved');
    const paid = requests.filter((r) => r.status === 'paid');
    const rejected = requests.filter((r) => r.status === 'rejected');

    const pendingAmount = pending.reduce((acc, r) => acc + r.amount, 0);
    const approvedAmount = approved.reduce((acc, r) => acc + r.amount, 0);
    const paidAmount = paid.reduce((acc, r) => acc + r.amount, 0);

    return {
      pendingCount: pending.length,
      approvedCount: approved.length,
      paidCount: paid.length,
      rejectedCount: rejected.length,
      pendingAmount,
      approvedAmount,
      paidAmount,
    };
  }, [allWithdrawals]);

  const handleActionConfirm = async () => {
    if (!selectedRequest || !actionType || !firestore) return;

    setIsProcessing(true);
    try {
      const requestRef = doc(firestore, 'withdrawalRequests', selectedRequest.id);
      const updateData: Record<string, any> = {};

      switch (actionType) {
        case 'approve':
          updateData.status = 'approved';
          break;
        case 'reject':
          updateData.status = 'rejected';
          break;
        case 'paid':
          updateData.status = 'paid';
          break;
      }

      await updateDoc(requestRef, updateData);

      toast({
        title: 'Updated',
        description: `Withdrawal request ${actionType === 'paid' ? 'marked as paid' : actionType}d successfully.`,
      });

      setSelectedRequest(null);
      setActionType(null);
    } catch (error) {
      console.error('Withdrawal action error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to process withdrawal request.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getActionLabel = (type: 'approve' | 'reject' | 'paid' | null) => {
    switch (type) {
      case 'approve':
        return 'Approve this withdrawal request?';
      case 'reject':
        return 'Reject this withdrawal request?';
      case 'paid':
        return 'Mark this withdrawal as paid?';
      default:
        return '';
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Withdrawal Requests</h1>
        <p className="text-muted-foreground">Manage vendor withdrawal requests and process payouts.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{withdrawalStats.pendingCount}</p>
            <p className="text-xs text-muted-foreground">₦{withdrawalStats.pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{withdrawalStats.approvedCount}</p>
            <p className="text-xs text-muted-foreground">₦{withdrawalStats.approvedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paid Out</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{withdrawalStats.paidCount}</p>
            <p className="text-xs text-muted-foreground">₦{withdrawalStats.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{withdrawalStats.rejectedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Withdrawn</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₦{withdrawalStats.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Withdrawal Requests</CardTitle>
          <CardDescription>View and manage all vendor withdrawal requests.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Account Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!allWithdrawals || allWithdrawals.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No withdrawal requests found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (allWithdrawals || []).map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{format(new Date(request.createdAt), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="font-mono text-xs">{request.vendorId.slice(0, 8)}...</TableCell>
                        <TableCell className="font-bold">₦{request.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-sm">
                          <div>
                            <p className="font-medium">{request.accountName}</p>
                            <p className="text-muted-foreground text-xs">{request.bankName} • {request.accountNumber}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              request.status === 'paid'
                                ? 'default'
                                : request.status === 'approved'
                                  ? 'secondary'
                                  : request.status === 'rejected'
                                    ? 'destructive'
                                    : 'outline'
                            }
                          >
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {request.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setActionType('approve');
                                }}
                              >
                                <Check className="h-4 w-4 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setActionType('reject');
                                }}
                              >
                                <X className="h-4 w-4 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                          {request.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRequest(request);
                                setActionType('paid');
                              }}
                            >
                              <CreditCard className="h-4 w-4 mr-1" /> Mark Paid
                            </Button>
                          )}
                          {['rejected', 'paid'].includes(request.status) && (
                            <Badge variant="secondary" className="cursor-default">{request.status}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!selectedRequest && !!actionType} onOpenChange={() => setSelectedRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              {getActionLabel(actionType)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <p className="text-sm">
              <strong>Amount:</strong> ₦{selectedRequest?.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm">
              <strong>Account:</strong> {selectedRequest?.accountName} • {selectedRequest?.bankName}
            </p>
          </div>
          <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isProcessing} onClick={handleActionConfirm}>
            {isProcessing ? 'Processing...' : 'Confirm'}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
