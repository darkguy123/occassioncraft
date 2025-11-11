'use client';

import Image from "next/image"
import { userTickets } from "@/lib/placeholder-data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Calendar, MapPin, Clock, Ticket } from "lucide-react"

export default function UserDashboardPage() {
  const qrCodeImage = {
      imageUrl: '/assets/qr-code.png',
      imageHint: 'qr code'
  };

  return (
    <div className="container mx-auto max-w-5xl py-12 px-4">
      <div className="space-y-2 mb-8">
        <h1 className="text-4xl font-bold font-headline">My Tickets</h1>
        <p className="text-muted-foreground">All your upcoming events in one place.</p>
      </div>

      <div className="space-y-8">
        {userTickets.length > 0 ? (
          userTickets.map((ticket) => (
            <Card key={ticket.id} className="overflow-hidden shadow-lg transition-shadow hover:shadow-xl">
              <div className="grid md:grid-cols-3">
                <div className="md:col-span-2">
                   <CardHeader>
                    <CardTitle className="font-headline text-2xl">{ticket.event.name}</CardTitle>
                    <CardDescription>{ticket.event.organizer}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start text-sm">
                      <Calendar className="h-4 w-4 mr-3 mt-1 shrink-0" />
                      <div>
                        <p className="font-semibold">{new Date(ticket.event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p className="text-muted-foreground">{ticket.event.time}</p>
                      </div>
                    </div>
                    <div className="flex items-start text-sm">
                      <MapPin className="h-4 w-4 mr-3 mt-1 shrink-0" />
                      <div>
                        <p className="font-semibold">{ticket.event.location}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center text-xs text-muted-foreground">
                        <Ticket className="h-4 w-4 mr-2" />
                        <p>Purchased on {new Date(ticket.purchaseDate).toLocaleDateString()}</p>
                    </div>
                  </CardContent>
                </div>
                <div className="bg-secondary/50 p-6 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l">
                    <Image
                        src={qrCodeImage.imageUrl}
                        alt="QR Code"
                        width={150}
                        height={150}
                        className="rounded-lg"
                        data-ai-hint={qrCodeImage.imageHint}
                    />
                    <p className="text-muted-foreground text-sm mt-4 text-center">Scan this at the event entrance</p>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="text-center p-12">
            <CardTitle>No Tickets Yet</CardTitle>
            <CardDescription className="mt-2">When you purchase tickets for an event, they will appear here.</CardDescription>
          </Card>
        )}
      </div>
    </div>
  );
}
