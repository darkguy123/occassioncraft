import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { vendorEvents } from "@/lib/placeholder-data";
import { BarChart2, Ticket, DollarSign, PlusCircle, QrCode, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

export default function VendorDashboardPage() {
    const totalRevenue = vendorEvents.reduce((acc, event) => acc + event.revenue, 0);
    const totalTicketsSold = vendorEvents.reduce((acc, event) => acc + event.ticketsSold, 0);

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
            <h1 className="text-4xl font-bold font-headline">Vendor Dashboard</h1>
            <p className="text-muted-foreground">Manage your events, track sales, and engage with your attendees.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline">
                <QrCode className="mr-2 h-4 w-4" />
                Scan Ticket
            </Button>
            <Button asChild>
                <Link href="/create-event">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Event
                </Link>
            </Button>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{totalTicketsSold.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+180.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Events</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendorEvents.length}</div>
            <p className="text-xs text-muted-foreground">+2 since last month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Events</CardTitle>
          <CardDescription>A list of your active and past events.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Tickets Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendorEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div className="font-medium">{event.name}</div>
                    <div className="text-sm text-muted-foreground">{new Date(event.date).toLocaleDateString()}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={new Date(event.date) > new Date() ? "default" : "secondary"} className={new Date(event.date) > new Date() ? "bg-green-100 text-green-800" : ""}>
                      {new Date(event.date) > new Date() ? "Upcoming" : "Completed"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{event.ticketsSold.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${event.revenue.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View</DropdownMenuItem>
                          <DropdownMenuItem>Manage</DropdownMenuItem>
                          <DropdownMenuItem>Duplicate</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
