
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
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function WalletPage() {
    const { user, isUserLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/login');
        }
    }, [isUserLoading, user, router]);

    if (isUserLoading) {
        return (
            <div className="container max-w-4xl py-12 px-4 text-center">
                <p>Loading...</p>
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
                        <p className="text-4xl font-bold">$0.00</p>
                        <Button className="w-full mt-6" disabled>Request Payout</Button>
                    </CardContent>
                </Card>
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Balance History</CardTitle>
                        <CardDescription>Your balance over the last 30 days.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2 h-[150px] flex items-center justify-center">
                       <p className="text-muted-foreground">No balance history available.</p>
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
                           <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
                                     No transactions yet.
                                </TableCell>
                           </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
