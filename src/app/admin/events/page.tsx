
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from '@/components/ui/badge';
import { sampleEvents } from '@/lib/placeholder-data';


export default function AdminEventsPage() {
  
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Events</h1>
            <p className="text-muted-foreground">Manage all events on the platform.</p>
        </div>
        <Button asChild>
          <Link href="/create-event">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Event
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
          <CardDescription>
            A list of all events including their status and details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>Event</TableCell>
                <TableCell>Organizer</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Price</TableCell>
                <TableCell className="text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleEvents.length > 0 ? (
                sampleEvents.map(event => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.name}</TableCell>
                    <TableCell>{event.organizer}</TableCell>
                    <TableCell><Badge variant="secondary">Published</Badge></TableCell>
                    <TableCell>${event.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                    <Link href={`/admin/events/${event.id}/edit`}>
                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    No events found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
