
'use client';

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import type { User, Wallet, Transaction } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { TopUpDialog } from '@/components/wallet/top-up-dialog';
import { format } from 'date-fns';

type WalletData = Wallet & {
    id: string;
}

export default function WalletPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const [isTopUpOpen, setIsTopUpOpen] = useState(false);

    const userDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    
    const walletDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'wallets', user.uid);
    }, [firestore, user]);
    
    const transactionsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `wallets/${user.uid}/transactions`), orderBy('date', 'desc'));
    }, [firestore, user]);

    const { data: userData, isLoading: isUserDataLoading } = useDoc<User>(userDocRef);
    const { data: walletData, isLoading: isWalletLoading } = useDoc<WalletData>(walletDocRef);
    const { data: transactions, isLoading: areTransactionsLoading } = useCollection<Transaction>(transactionsQuery);

    const isLoading = isUserLoading || isUserDataLoading || isWalletLoading || areTransactionsLoading;
    const isVendor = (userData?.roles || []).includes('vendor');

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/login');
        }
    }, [isUserLoading, user, router]);

    if (isLoading) {
        return (
            <div className="container max-w-4xl py-12 px-4">
                 <Skeleton className="h-10 w-1/3 mb-8" />
                 <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <Skeleton className="h-5 w-2/3" />
                        </CardHeader>
                        <CardContent>
                             <Skeleton className="h-10 w-1/2 mb-6" />
                             <Skeleton className="h-10 w-full" />
                        </CardContent>
                    </Card>
                    <Skeleton className="md:col-span-2 h-40" />
                </div>
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    const balance = walletData?.balance || 0;

    return (
        <>
        <TopUpDialog isOpen={isTopUpOpen} onClose={() => setIsTopUpOpen(false)} />
        <div className="container max-w-4xl py-12 px-4">
            <div className="space-y-2 mb-8">
                <h1 className="text-4xl font-bold font-headline">Wallet</h1>
                <p className="text-muted-foreground">Manage your balance and view your transaction history.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
                <Card className="md:col-span-1 bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Available Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">₦{balance.toFixed(2)}</p>
                        <div className="flex flex-col sm:flex-row gap-2 mt-6">
                            <Button className="w-full" onClick={() => setIsTopUpOpen(true)}>Top Up</Button>
                            <Button className="w-full" variant="outline" disabled={!isVendor || balance <= 0}>Request Payout</Button>
                        </div>
                    </CardContent>
                </Card>
                <Card className="md:col-span-2 bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Balance History</CardTitle>
                        <CardDescription>Your balance over the last 30 days.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2 h-[150px] flex items-center justify-center">
                       <p className="text-muted-foreground">No balance history available.</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-card/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Transaction</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {transactions && transactions.length > 0 ? (
                                transactions.map(tx => (
                                    <TableRow key={tx.id}>
                                        <TableCell>
                                            <div className="font-medium capitalize">{tx.description}</div>
                                            <div className="text-xs text-muted-foreground">{tx.id}</div>
                                        </TableCell>
                                        <TableCell>{format(new Date(tx.date), 'PPp')}</TableCell>
                                        <TableCell className={`text-right font-semibold ${tx.amount > 0 ? 'text-green-500' : 'text-destructive'}`}>
                                            {tx.amount > 0 ? '+' : ''}₦{tx.amount.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))
                           ) : (
                               <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
                                        No transactions yet.
                                    </TableCell>
                               </TableRow>
                           )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
        </>
    );
}
