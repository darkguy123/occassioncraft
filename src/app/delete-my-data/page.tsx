'use client';

import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { AlertTriangle, Send } from 'lucide-react';
import { collection } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


const deleteDataSchema = z.object({
  reason: z.string().min(10, { message: 'Please provide a reason with at least 10 characters.' }),
  confirmation: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm to proceed.' }),
  }),
});

type DeleteDataFormValues = z.infer<typeof deleteDataSchema>;

export default function DeleteDataPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const form = useForm<DeleteDataFormValues>({
        resolver: zodResolver(deleteDataSchema),
        defaultValues: {
            reason: '',
            confirmation: false,
        }
    });

    const onSubmit: SubmitHandler<DeleteDataFormValues> = async (data) => {
        if (!user || !firestore) return;

        const requestData = {
            userId: user.uid,
            email: user.email,
            reason: data.reason,
            status: 'pending',
            createdAt: new Date().toISOString(),
        };

        const requestsCollection = collection(firestore, 'dataDeletionRequests');
        addDocumentNonBlocking(requestsCollection, requestData);

        toast({
            title: 'Deletion Request Submitted',
            description: 'Your request has been received. We will process it within 30 days and notify you via email.',
        });

        router.push('/');
    };

    if (isUserLoading) {
        return (
            <div className="container max-w-2xl py-12 px-4 space-y-6">
                <Skeleton className="h-10 w-1/3" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (!user) {
        return (
             <div className="container mx-auto max-w-2xl py-12 px-4">
                 <Card className="text-center">
                     <CardHeader>
                        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
                         <CardTitle>Authentication Required</CardTitle>
                         <CardDescription>
                            You must be logged in to request data deletion.
                         </CardDescription>
                     </CardHeader>
                     <CardContent>
                         <Button asChild><Link href="/login?redirect=/delete-my-data">Login</Link></Button>
                     </CardContent>
                 </Card>
            </div>
        )
    }

  return (
    <div className="container max-w-2xl py-12 px-4">
        <div className="space-y-2 mb-8">
            <h1 className="text-3xl font-bold font-headline">Request Data Deletion</h1>
            <p className="text-muted-foreground">Submit a formal request to have your account and personal data deleted from our platform.</p>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Data Deletion Form</CardTitle>
                <CardDescription>
                    Please fill out this form to proceed. This action is irreversible.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Alert variant="destructive" className="mb-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>
                        Requesting data deletion will permanently remove your account, purchased tickets, and all associated information. This process cannot be undone.
                    </AlertDescription>
                </Alert>

                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input value={user.email || ''} disabled />
                             <p className="text-sm text-muted-foreground">Your request will be associated with this account.</p>
                        </div>

                        <FormField
                            control={form.control}
                            name="reason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reason for Deletion</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Please tell us why you are leaving..."
                                            className="min-h-24"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="confirmation"
                            render={({ field }) => (
                                <FormItem>
                                    <Alert className="flex items-start space-x-3 p-4">
                                         <FormControl>
                                            <input type="checkbox" checked={field.value} onChange={field.onChange} className="mt-1 h-4 w-4 shrink-0 rounded border-primary text-primary focus:ring-primary" />
                                        </FormControl>
                                        <div className="grid gap-1.5 leading-none">
                                            <FormLabel>I understand that this action is permanent and will delete all my data.</FormLabel>
                                            <FormMessage />
                                        </div>
                                    </Alert>
                                </FormItem>
                            )}
                        />

                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button type="button" variant="destructive" className="w-full" disabled={!form.formState.isValid}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Submit Deletion Request
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={form.handleSubmit(onSubmit)}>
                                    Yes, delete my data
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                    </form>
                 </Form>
            </CardContent>
        </Card>

    </div>
  )
}
