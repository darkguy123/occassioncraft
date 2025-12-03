
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, Star, Zap, ArrowDown, Palette } from "lucide-react";
import Link from "next/link";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { useState, useRef } from 'react';
import { VendorApplicationDialog } from "@/components/vendor/application-dialog";

const pricingTiers = [
  {
    name: "Regular",
    price: "₦70,000",
    priceDescription: "for 50 tickets",
    description: "Get started and design beautiful standard tickets.",
    features: [
      "Up to 50 tickets",
      "5 Ticket Templates",
      "Standard QR code generation",
      "Basic event linking",
    ],
    cta: "Choose Regular",
    variant: "outline"
  },
  {
    name: "Premium",
    price: "From ₦90,000",
    priceDescription: "for 50 tickets",
    description: "For creators who need more flexibility and features.",
    features: [
      "Premium General & Individual tickets",
      "10+ Ticket Templates",
      "Add guest photos to tickets",
      "Advanced customization options",
    ],
    cta: "Choose Premium",
    variant: "default",
    popular: true,
  },
  {
    name: "Tiered",
    price: "From ₦10,000",
    priceDescription: "per batch",
    description: "For events with multiple ticket classes or limited drops.",
    features: [
      "5 Different tier options",
      "Variable ticket quantities",
      "Option to add guest names",
      "Create public or private tickets",
    ],
    cta: "Choose Tiered",
    variant: "outline",
  },
];

export default function VendorLandingPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isApplicationOpen, setIsApplicationOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | undefined>(undefined);
  const pricingRef = useRef<HTMLElement>(null);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData } = useDoc<User>(userDocRef);
  const isVendor = userData?.roles?.includes('vendor');

  const handleScrollToPricing = () => {
    pricingRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleCtaClick = (tierName?: string) => {
    if (user && !isVendor) {
      setSelectedTier(tierName);
      setIsApplicationOpen(true);
    }
  };

  const CtaButton = ({tier}: { tier?: typeof pricingTiers[number] }) => {
    const isFullWidth = !!tier;

    if (isUserLoading) {
      return <Button size="lg" disabled className={isFullWidth ? "w-full" : ""}>Loading...</Button>
    }
    if (user && isVendor) {
      return <Button size="lg" asChild variant={tier?.variant as any} className={isFullWidth ? "w-full" : ""}><Link href="/vendor/dashboard">Go to Dashboard</Link></Button>
    }
    if (user && !isVendor) {
      return <Button size="lg" variant={tier?.variant as any} className={isFullWidth ? "w-full" : ""} onClick={() => handleCtaClick(tier?.name)}>{tier ? tier.cta : 'Apply Now'}</Button>
    }
    return <Button size="lg" asChild variant={tier?.variant as any} className={isFullWidth ? "w-full" : ""}><Link href="/signup">{tier ? tier.cta : 'Become a Vendor Today'}</Link></Button>
  }


  return (
    <>
      {user && !isVendor && <VendorApplicationDialog isOpen={isApplicationOpen} onClose={() => setIsApplicationOpen(false)} selectedTier={selectedTier}/>}
      <div className="bg-background text-foreground">
        {/* Hero Section */}
        <section className="py-20 md:py-32 text-center">
          <div className="container px-4">
            <h1 className="text-4xl md:text-6xl font-headline font-bold">Craft Beautiful Tickets, Not Just Entries</h1>
            <p className="mt-4 text-lg md:text-xl max-w-3xl mx-auto text-muted-foreground">The ultimate platform to design, create, and manage tickets for any occasion. Go beyond the event and create a memorable experience.</p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <CtaButton />
              <Button size="lg" variant="outline" onClick={handleScrollToPricing}>
                <ArrowDown className="mr-2 h-4 w-4" />
                View Packages
              </Button>
            </div>
          </div>
        </section>

        {/* How it works Section */}
        <section className="py-20 bg-secondary">
          <div className="container px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-headline font-bold">Your Creative Flow</h2>
              <p className="mt-2 text-muted-foreground max-w-xl mx-auto">Three simple steps to design and distribute your unique tickets.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4">1</div>
                  <h3 className="text-xl font-bold mb-2">Create an Event</h3>
                  <p className="text-muted-foreground">Set up the basic details for your event, like date and venue.</p>
              </div>
              <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4">2</div>
                  <h3 className="text-xl font-bold mb-2">Craft Your Tickets</h3>
                  <p className="text-muted-foreground">Choose a package, design your template, and set your rules.</p>
              </div>
              <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4">3</div>
                  <h3 className="text-xl font-bold mb-2">Publish & Share</h3>
                  <p className="text-muted-foreground">Link tickets to your event and start distributing them.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section ref={pricingRef} className="py-20 md:py-32">
          <div className="container px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-headline font-bold">Choose Your Package</h2>
              <p className="mt-2 text-muted-foreground max-w-xl mx-auto">Simple, transparent pricing for every type of creator.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
              {pricingTiers.map((tier) => (
                <Card key={tier.name} className={`relative flex flex-col ${tier.popular ? 'border-primary border-2 -my-4' : ''}`}>
                  {tier.popular && (
                      <div className="absolute top-0 -translate-y-1/2 w-full flex justify-center">
                          <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                            <Star className="h-4 w-4" /> Most Popular
                          </div>
                      </div>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">{tier.name}</CardTitle>
                    <CardDescription>{tier.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow flex flex-col">
                    <div className="text-center mb-6">
                      <span className="text-4xl font-bold">{tier.price}</span>
                      <span className="text-muted-foreground">/{tier.priceDescription}</span>
                    </div>
                    <ul className="space-y-4 mb-8 flex-grow">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start">
                          <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-1" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <CtaButton tier={tier} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
