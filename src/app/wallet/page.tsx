
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
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { ArrowDownLeft, ArrowUpRight, Banknote } from 'lucide-react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, limit } from 'firebase/firestore';
import type { Wallet, Transaction } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const chartData = [
  { date: '2023-05-01', balance: 5231.89 },
  { date: '2023-05-05', balance: 5500.00 },
  { date: '2023-05-10', balance: 5450.50 },
  { date: '2023-05-15', balance: 6000.75 },
  { date: '2023-05-20', balance: 5900.00 },
  { date: '2023-05-25', balance: 6500.25 },
  { date: '2023-05-30', balance: 7120.90 },
];

export default function WalletPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const walletRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'wallets', user.uid);
    }, [user, firestore]);

    const transactionsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(
            collection(firestore, 'wallets', user.uid, 'transactions'),
            orderBy('date', 'desc'),
            limit(10)
        );
    }, [user, firestore]);

    const { data: wallet, isLoading: isWalletLoading } = useDoc<Wallet>(walletRef);
    const { data: transactions, isLoading: isTransactionsLoading } = useCollection<Transaction>(transactionsQuery);

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/login');
        }
    }, [isUserLoading, user, router]);

    const getTransactionIcon = (type: Transaction['type']) => {
        switch (type) {
            case 'ticket-sale':
                return <ArrowUpRight className="h-5 w-5 text-green-500" />;
            case 'payout':
                return <ArrowDownLeft className="h-5 w-5 text-red-500" />;
            case 'refund':
                return <ArrowDownLeft className="h-5 w-5 text-yellow-500" />;
            default:
                return <Banknote className="h-5 w-5 text-muted-foreground" />;
        }
    };

    const isLoading = isUserLoading || isWalletLoading || isTransactionsLoading;
    
    if (isLoading) {
         return (
            <div className="container max-w-4xl py-12 px-4 space-y-8">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-4 w-64" />
                <div className="grid md:grid-cols-3 gap-6">
                    <Skeleton className="h-32 col-span-1" />
                    <Skeleton className="h-32 col-span-2" />
                </div>
                <Skeleton className="h-96" />
            </div>
        )
    }

    return (
        <div className="container max-w-4xl py-12 px-4">
            <div className="space-y-2 mb-8">
                <h1 className="text-4xl font-bold font-headline">Wallet</h1>
                <p className="text-muted-foreground">Manage your balance and view your transaction history.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Available Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">
                            {wallet ? `$${wallet.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'}
                        </p>
                        <Button className="w-full mt-6">Request Payout</Button>
                    </CardContent>
                </Card>
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Balance History</CardTitle>
                        <CardDescription>Your balance over the last 30 days.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={150}>
                            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="flex flex-col">
                                                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                                Balance
                                                            </span>
                                                            <span className="font-bold text-muted-foreground">
                                                                ${(payload[0].value as number).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        }
                                        return null
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="balance"
                                    strokeWidth={2}
                                    stroke="hsl(var(--primary))"
                                    fill="url(#balanceGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card>
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
                            {transactions && transactions.map((tx) => (
                                <TableRow key={tx.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="bg-secondary p-2 rounded-full">
                                                {getTransactionIcon(tx.type)}
                                            </div>
                                            <div>
                                                <p className="font-medium capitalize">{tx.type.replace('-', ' ')}</p>
                                                <p className="text-sm text-muted-foreground">{tx.description}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{format(new Date(tx.date), 'MMM d, yyyy')}</TableCell>
                                    <TableCell className={`text-right font-medium ${tx.amount > 0 ? 'text-green-600' : 'text-foreground'}`}>
                                        {tx.amount > 0 ? '+' : ''}${tx.amount.toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {!isLoading && transactions?.length === 0 && (
                        <p className="text-center text-muted-foreground py-12">No transactions yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
