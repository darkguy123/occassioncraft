
'use client';

import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { LifeBuoy, Search, Send } from "lucide-react";
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const supportSchema = z.object({
  email: z.string().email(),
  subject: z.string().min(5, 'Subject must be at least 5 characters long.'),
  message: z.string().min(10, 'Message must be at least 10 characters long.'),
});

type SupportFormValues = z.infer<typeof supportSchema>;


const faqs = [
    {
        question: "How do I create an event?",
        answer: "To create an event, you must be a registered and approved vendor. Once approved, you can navigate to the 'Create Event' page from your vendor dashboard and follow the multi-step form to publish your event."
    },
    {
        question: "How do I reset my password?",
        answer: "On the login page, click the 'Forgot your password?' link. You will be prompted to enter your email address, and a password reset link will be sent to you."
    },
    {
        question: "What are the fees for selling tickets?",
        answer: "Our fees depend on the pricing plan you choose. The Free plan has a 5% transaction fee, the Premium plan has a 2.5% fee, and the Diamond plan has a 1% fee. You can view all pricing details on our vendor landing page."
    },
    {
        question: "How do I get my vendor application approved?",
        answer: "After submitting your vendor registration, our admin team will review your application. This process typically takes 2-3 business days. You will be notified by email once your application status changes."
    },
    {
        question: "Where can I see the tickets I've purchased?",
        answer: "All tickets you've purchased can be found on your 'My Tickets' dashboard, which is accessible from the user menu after you log in."
    }
];

export default function HelpCenterPage() {
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();

    const form = useForm<SupportFormValues>({
        resolver: zodResolver(supportSchema),
        defaultValues: {
            email: user?.email || '',
            subject: '',
            message: '',
        }
    });

    const onSubmit: SubmitHandler<SupportFormValues> = (data) => {
        if (!firestore) {
            toast({ variant: "destructive", title: "Error", description: "Could not connect to the database." });
            return;
        }

        const ticketsCollection = collection(firestore, 'tickets');
        addDocumentNonBlocking(ticketsCollection, {
            ...data,
            userId: user?.uid || 'anonymous',
            createdAt: new Date().toISOString(),
            status: 'open',
        });
        
        toast({
            title: "Message Sent!",
            description: "Thanks for reaching out. Our support team will get back to you shortly.",
        });
        form.reset();
    };

    return (
        <div className="bg-secondary/50">
            {/* Hero Section */}
            <section className="py-20 text-center bg-background">
                <div className="container px-4">
                    <LifeBuoy className="mx-auto h-16 w-16 text-primary mb-4" />
                    <h1 className="text-4xl md:text-5xl font-headline font-bold">Help Center</h1>
                    <p className="mt-4 text-lg md:text-xl max-w-2xl mx-auto text-muted-foreground">How can we help you today?</p>
                    <div className="mt-8 w-full max-w-2xl mx-auto">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input placeholder="Search for answers..." className="pl-12 h-14 text-lg rounded-full" />
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ and Contact Section */}
            <div className="container mx-auto px-4 py-16">
                <div className="grid lg:grid-cols-3 gap-12">
                    {/* FAQs */}
                    <div className="lg:col-span-2">
                        <h2 className="text-3xl font-headline font-bold mb-6">Frequently Asked Questions</h2>
                        <Accordion type="single" collapsible className="w-full bg-background rounded-lg border p-4">
                            {faqs.map((faq, index) => (
                                <AccordionItem key={index} value={`item-${index}`}>
                                    <AccordionTrigger className="text-left font-semibold hover:no-underline">{faq.question}</AccordionTrigger>
                                    <AccordionContent className="text-muted-foreground">
                                        {faq.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>

                    {/* Contact Support */}
                    <div>
                        <Card className="sticky top-24">
                            <CardHeader>
                                <CardTitle>Contact Support</CardTitle>
                                <CardDescription>Can't find an answer? Let us help.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                     <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Your Email</FormLabel>
                                                <FormControl>
                                                    <Input type="email" placeholder="you@example.com" {...field} />
                                                </FormControl>
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
                                                    <Input placeholder="e.g., Issue with my ticket" {...field} />
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
                                                    <Textarea placeholder="Please describe your issue in detail..." className="min-h-32" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                                        <Send className="mr-2 h-4 w-4" />
                                        Send Message
                                    </Button>
                                </form>
                                </Form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

    