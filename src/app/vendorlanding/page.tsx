
'use client';

import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Link from "next/link";
import { useUser } from "@/firebase";
import { useState } from "react";
import { VendorApplicationDialog } from "@/components/vendor/vendor-application-dialog";

const features = [
  "Design beautiful, custom-branded tickets",
  "Create unlimited events, big or small",
  "Manage ticket sales and track revenue",
  "Seamless QR code scanning for check-in",
  "Engage with your attendees",
  "Free to join and start selling",
];

export default function VendorLandingPage() {
  const { user, isUserLoading } = useUser();
  const [isApplicationOpen, setIsApplicationOpen] = useState(false);

  const CtaButton = () => {
    if (isUserLoading) {
      return <Button size="lg" disabled className="w-full sm:w-auto">Loading...</Button>
    }
    
    // If the user is logged in, the button opens the application dialog.
    if (user) {
        return (
            <Button size="lg" onClick={() => setIsApplicationOpen(true)} className="w-full sm:w-auto">
                Become a Vendor Today
            </Button>
        )
    }

    // If logged out, it links to the signup page with a vendor hint.
    return <Button size="lg" asChild className="w-full sm:w-auto"><Link href="/signup?role=vendor">Become a Vendor Today</Link></Button>
  }

  return (
    <>
      <VendorApplicationDialog isOpen={isApplicationOpen} onOpenChange={setIsApplicationOpen} />

      <div className="bg-background text-foreground">
        {/* Hero Section */}
        <section className="py-20 md:py-32 text-center">
          <div className="container px-4">
            <h1 className="text-4xl md:text-6xl font-headline font-bold">Craft Beautiful Tickets, Not Just Entries</h1>
            <p className="mt-4 text-lg md:text-xl max-w-3xl mx-auto text-muted-foreground">The ultimate platform to design, create, and manage tickets for any occasion. Go beyond the event and create a memorable experience.</p>
            <div className="mt-8 flex items-center justify-center">
              <CtaButton />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-secondary">
          <div className="container px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-headline font-bold">Everything You Need to Succeed</h2>
              <p className="mt-2 text-muted-foreground max-w-xl mx-auto">OccasionCraft is free to join and packed with powerful features to make your event a success.</p>
            </div>
            <div className="max-w-3xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    {features.map((feature) => (
                        <div key={feature} className="flex items-start">
                            <Check className="h-5 w-5 text-green-500 mr-3 shrink-0 mt-1" />
                            <span className="text-muted-foreground">{feature}</span>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        </section>
        
        {/* Final CTA */}
        <section className="py-20">
            <div className="container text-center">
                <h2 className="text-3xl font-bold font-headline">Ready to Create?</h2>
                <p className="mt-2 text-muted-foreground max-w-lg mx-auto">Join a community of creators and start hosting your events on OccasionCraft today. It's free and easy to get started.</p>
                 <div className="mt-8 flex items-center justify-center">
                    <CtaButton />
                </div>
            </div>
        </section>
      </div>
    </>
  );
}
