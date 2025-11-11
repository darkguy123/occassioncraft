
'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { LifeBuoy, Search, Send } from "lucide-react";

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

    const handleSupportSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        // In a real app, you'd handle form submission to a backend here.
        toast({
            title: "Message Sent!",
            description: "Thanks for reaching out. Our support team will get back to you shortly.",
        });
        (event.target as HTMLFormElement).reset();
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
                                <form onSubmit={handleSupportSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Your Email</Label>
                                        <Input id="email" type="email" placeholder="you@example.com" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="subject">Subject</Label>
                                        <Input id="subject" placeholder="e.g., Issue with my ticket" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="message">Message</Label>
                                        <Textarea id="message" placeholder="Please describe your issue in detail..." className="min-h-32" required />
                                    </div>
                                    <Button type="submit" className="w-full">
                                        <Send className="mr-2 h-4 w-4" />
                                        Send Message
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
