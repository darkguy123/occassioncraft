'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { addDoc, collection, query, where } from 'firebase/firestore';
import type { Ticket, WithdrawalRequest } from '@/lib/types';
import { calculatePlatformFee, calculateVendorNet } from '@/lib/payments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function VendorWalletPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [amount, setAmount] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ticketsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'tickets'), where('vendorId', '==', user.uid));
  }, [user, firestore]);

  const withdrawalsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'withdrawalRequests'), where('vendorId', '==', user.uid));
  }, [user, firestore]);

  const { data: tickets, isLoading: isTicketsLoading } = useCollection<Ticket>(ticketsQuery);
  const { data: withdrawals, isLoading: isWithdrawalsLoading } = useCollection<WithdrawalRequest>(withdrawalsQuery);

  const sortedWithdrawals = useMemo(() => {
    return [...(withdrawals || [])].sort((a, b) => {
      const left = Date.parse(a.createdAt || '');
      const right = Date.parse(b.createdAt || '');
      return Number.isNaN(right) ? -1 : Number.isNaN(left) ? 1 : right - left;
    });
  }, [withdrawals]);

  const walletMetrics = useMemo(() => {
    const soldTickets = (tickets || []).filter((ticket) => ticket.userId !== ticket.vendorId && ticket.isPaid);
    const grossSales = soldTickets.reduce((acc, ticket) => acc + (ticket.price || 0), 0);
    const platformFees = soldTickets.reduce(
      (acc, ticket) => acc + (ticket.platformFeeAmount ?? calculatePlatformFee(ticket.price || 0)),
      0
    );
    const walletCredits = soldTickets.reduce(
      (acc, ticket) => acc + (ticket.vendorNetAmount ?? calculateVendorNet(ticket.price || 0)),
      0
    );

    const pendingWithdrawals = sortedWithdrawals
      .filter((request) => request.status === 'pending' || request.status === 'approved')
      .reduce((acc, request) => acc + request.amount, 0);

    const paidOut = sortedWithdrawals
      .filter((request) => request.status === 'paid')
      .reduce((acc, request) => acc + request.amount, 0);

    return {
      grossSales,
      platformFees,
      walletCredits,
      pendingWithdrawals,
      paidOut,
      availableBalance: Math.max(walletCredits - pendingWithdrawals - paidOut, 0),
    };
  }, [tickets, sortedWithdrawals]);

  const handleRequestWithdrawal = async () => {
    if (!firestore || !user) return;

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Amount',
        description: 'Enter a valid withdrawal amount.',
      });
      return;
    }

    if (parsedAmount > walletMetrics.availableBalance) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Balance',
        description: 'Withdrawal amount exceeds your available wallet balance.',
      });
      return;
    }

    if (!accountName || !accountNumber || !bankName) {
      toast({
        variant: 'destructive',
        title: 'Missing Bank Details',
        description: 'Please fill in account name, account number, and bank name.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, 'withdrawalRequests'), {
        vendorId: user.uid,
        amount: Number(parsedAmount.toFixed(2)),
        accountName,
        accountNumber,
        bankName,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      setAmount('');
      toast({
        title: 'Withdrawal Requested',
        description: 'Your withdrawal request has been submitted for review.',
      });
    } catch (error) {
      console.error('Withdrawal request error:', error);
      toast({
        variant: 'destructive',
        title: 'Request Failed',
        description: 'Unable to submit withdrawal request at the moment.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isTicketsLoading || isWithdrawalsLoading;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Wallet</h1>
        <p className="text-muted-foreground">Track ticket sales, 5% platform deductions, and request withdrawals.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gross Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₦{walletMetrics.grossSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Platform Fee (5%)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₦{walletMetrics.platformFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Wallet Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₦{walletMetrics.walletCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">₦{walletMetrics.availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Request Withdrawal</CardTitle>
            <CardDescription>Submit your bank details and withdrawal amount.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (NGN)</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="0123456789"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="GTBank"
              />
            </div>
            <Button onClick={handleRequestWithdrawal} disabled={isSubmitting || isLoading} className="w-full">
              {isSubmitting ? 'Submitting...' : 'Submit Withdrawal Request'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Withdrawal History</CardTitle>
            <CardDescription>Track payout requests and current status.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedWithdrawals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No withdrawal requests yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedWithdrawals.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>₦{request.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell>
                          <Badge variant={request.status === 'paid' ? 'default' : request.status === 'rejected' ? 'destructive' : 'secondary'}>
                            {request.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
