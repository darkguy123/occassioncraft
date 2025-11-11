'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, Star, Zap } from "lucide-react";
import Link from "next/link";
import { useUser } from "@/firebase";

const pricingTiers = [
  {
    name: "Free",
    price: "$0",
    priceDescription: "per month",
    description: "Get started and list your first few events for free.",
    features: [
      "Up to 3 active events",
      "Basic event page",
      "Standard support",
      "5% transaction fee",
    ],
    cta: "Get Started",
    variant: "outline"
  },
  {
    name: "Premium",
    price: "$49",
    priceDescription: "per month",
    description: "For growing businesses looking for more features.",
    features: [
      "Up to 20 active events",
      "Customizable event pages",
      "Priority email support",
      "2.5% transaction fee",
      "Advanced analytics"
    ],
    cta: "Choose Premium",
    variant: "default",
    popular: true,
  },
  {
    name: "Diamond",
    price: "$99",
    priceDescription: "per month",
    description: "For established businesses that need it all.",
    features: [
      "Unlimited active events",
      "Branded event pages & emails",
      "Dedicated account manager",
      "1% transaction fee",
      "API Access",
    ],
    cta: "Go Diamond",
    variant: "outline",
  },
];

export default function VendorLandingPage() {
  const { user } = useUser();

  return (
    <div className="bg-background text-foreground">
      {/* Hero Section */}
      <section className="py-20 md:py-32 text-center">
        <div className="container px-4">
          <h1 className="text-4xl md:text-6xl font-headline font-bold">Turn Your Events into Opportunities</h1>
          <p className="mt-4 text-lg md:text-xl max-w-3xl mx-auto text-muted-foreground">The ultimate platform to create, manage, and grow your events. Reach more people and sell more tickets with OccasionCraft.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild>
                <Link href={"/signup"}>Become a Vendor Today</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="py-20 bg-secondary">
        <div className="container px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-headline font-bold">Getting Started is Easy</h2>
            <p className="mt-2 text-muted-foreground max-w-xl mx-auto">Three simple steps to launch your event on our platform.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4">1</div>
                <h3 className="text-xl font-bold mb-2">Create Your Account</h3>
                <p className="text-muted-foreground">Sign up as a vendor to get access to your dashboard.</p>
            </div>
            <div className="flex flex-col items-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4">2</div>
                <h3 className="text-xl font-bold mb-2">Publish Your Event</h3>
                <p className="text-muted-foreground">Use our intuitive form to add all your event details.</p>
            </div>
             <div className="flex flex-col items-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4">3</div>
                <h3 className="text-xl font-bold mb-2">Start Selling Tickets</h3>
                <p className="text-muted-foreground">Go live and watch the registrations roll in.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 md:py-32">
        <div className="container px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-headline font-bold">Choose Your Plan</h2>
            <p className="mt-2 text-muted-foreground max-w-xl mx-auto">Simple, transparent pricing. No hidden fees. Cancel anytime.</p>
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
                  <Button asChild className="w-full mt-auto" variant={tier.variant as any} size="lg">
                    <Link href={"/signup"}>{tier.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

       {/* Final CTA */}
        <section className="py-20 bg-secondary">
            <div className="container text-center">
                <Zap className="mx-auto h-12 w-12 text-primary mb-4" />
                <h2 className="text-3xl font-headline font-bold">Ready to launch your next event?</h2>
                <p className="mt-2 text-muted-foreground mb-6">Join hundreds of successful creators on our platform.</p>
                <Button size="lg" asChild>
                    <Link href={"/signup"}>Sign Up for Free</Link>
                </Button>
            </div>
        </section>

    </div>
  );
}
