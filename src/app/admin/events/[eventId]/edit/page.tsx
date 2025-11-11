
'use client';

import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import Link from "next/link";


export default function EditEventPage() {
 
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Edit Event</h1>
        <p className="text-muted-foreground">This page is a placeholder. The database has been reset.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Functionality Removed</CardTitle>
          <CardDescription>Event editing functionality is disabled because the project backend was reset.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>To re-enable this feature, the connection to the Firestore database needs to be re-established, and the data fetching logic must be implemented.</p>
          <Button asChild className="mt-4">
            <Link href="/admin/events">Back to Events</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
