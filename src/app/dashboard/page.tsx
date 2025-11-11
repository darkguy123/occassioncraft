
'use client';

import { Card, CardTitle, CardDescription } from "@/components/ui/card"

export default function UserDashboardPage() {

  return (
    <div className="container mx-auto max-w-5xl py-12 px-4">
      <div className="space-y-2 mb-8">
        <h1 className="text-4xl font-bold font-headline">My Tickets</h1>
        <p className="text-muted-foreground">All your upcoming events in one place.</p>
      </div>

      <div className="space-y-8">
        <Card className="text-center p-12">
            <CardTitle>No Tickets Yet</CardTitle>
            <CardDescription className="mt-2">When you purchase tickets for an event, they will appear here.</CardDescription>
        </Card>
      </div>
    </div>
  );
}
