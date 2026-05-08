'use client';

import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { LifeBuoy, Send, MessageSquare, CheckCircle } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import type { SupportTicketCategory } from '@/lib/types';
import { useState } from 'react';

const ISSUE_CATEGORIES: SupportTicketCategory[] = [
    'Billing & Payments',
    'Ticket Issue',
    'Account & Login',
    'Event Management',
    'Technical Problem',
    'Vendor Application',
    'Other',
];

const supportSchema = z.object({
    email: z.string().email('Please enter a valid email address.'),
    subject: z.string().min(5, 'Subject must be at least 5 characters.').max(100),
    category: z.enum([
        'Billing & Payments',
        'Ticket Issue',
        'Account & Login',
        'Event Management',
        'Technical Problem',
        'Vendor Application',
        'Other',
    ] as const),
    message: z.string().min(20, 'Please provide more detail (at least 20 characters).').max(2000),
});

type SupportFormValues = z.infer<typeof supportSchema>;

export default function SupportPage() {
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<SupportFormValues>({
        resolver: zodResolver(supportSchema),
        defaultValues: {
            email: user?.email || '',
            subject: '',
            message: '',
        },
    });

    const onSubmit: SubmitHandler<SupportFormValues> = async (data) => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not connect to the database.' });
            return;
        }
        setIsSubmitting(true);
        try {
            await addDoc(collection(firestore, 'support_tickets'), {
                ...data,
                userId: user?.uid || 'anonymous',
                userName: user?.displayName || null,
                status: 'open',
                createdAt: new Date().toISOString(),
            });
            setSubmitted(true);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Failed to send', description: 'Something went wrong. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-4">
                <Card className="max-w-md w-full text-center p-8">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold font-headline mb-2">Message Sent!</h2>
                    <p className="text-muted-foreground mb-6">
                        Thanks for reaching out. Our support team will review your message and get back to you at the email address you provided.
                    </p>
                    <Button onClick={() => { setSubmitted(false); form.reset(); }}>Send Another Message</Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-secondary/30">
            {/* Header */}
            <section className="bg-background border-b py-12">
                <div className="container mx-auto px-4 text-center">
                    <LifeBuoy className="mx-auto h-12 w-12 text-primary mb-3" />
                    <h1 className="text-4xl font-headline font-bold">Contact Support</h1>
                    <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                        Having trouble? Fill out the form below and our support team will respond as soon as possible.
                    </p>
                </div>
            </section>

            <div className="container mx-auto max-w-2xl px-4 py-12">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-primary" />
                            Submit a Support Request
                        </CardTitle>
                        <CardDescription>
                            Select the category that best describes your issue and provide as much detail as possible.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Your Email</FormLabel>
                                            <FormControl>
                                                <Input placeholder="you@example.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Issue Category</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a category..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {ISSUE_CATEGORIES.map((cat) => (
                                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="subject"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Subject</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Brief description of your issue" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="message"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Message</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Please describe your issue in detail..."
                                                    className="min-h-[150px] resize-none"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <span className="flex items-center gap-2">
                                            <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                            Sending...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Send className="h-4 w-4" />
                                            Send Message
                                        </span>
                                    )}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
