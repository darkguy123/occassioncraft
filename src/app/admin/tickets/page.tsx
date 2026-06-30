'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableHead,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Ticket, Event } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import {
  Search,
  Eye,
  CheckCircle,
  Calendar,
  User,
  Ticket as TicketIcon,
  Clock,
  ScanLine,
  FileImage,
  FileText,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import QRCode from 'qrcode';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { TicketDesign } from '@/components/ticket-design';
import { useToast } from '@/hooks/use-toast';

export default function AdminTicketsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const ticketRef = useRef<HTMLDivElement>(null);

  const ticketsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'tickets');
  }, [firestore]);

  const eventsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'events');
  }, [firestore]);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: tickets, isLoading: areTicketsLoading } = useCollection<Ticket>(ticketsQuery);
  const { data: events, isLoading: areEventsLoading } = useCollection<Event>(eventsQuery);
  const { data: users, isLoading: areUsersLoading } = useCollection<any>(usersQuery);

  const isLoading = areTicketsLoading || areEventsLoading || areUsersLoading;

  const enrichedTickets = useMemo(() => {
    if (!tickets) return [];
    return tickets.map((ticket) => {
      const event = events?.find((e) => e.id === ticket.eventId);
      const vendor = users?.find((u) => u.id === ticket.vendorId || u.uid === ticket.vendorId);
      return {
        ...ticket,
        eventName: event?.name || 'Unknown Event',
        eventDate: event?.dates && event.dates.length > 0 ? event.dates[0].date : null,
        eventLocation: event?.location || 'Unknown Location',
        vendorName: vendor ? `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim() || vendor.email : 'Unknown Vendor',
      };
    });
  }, [tickets, events, users]);

  const filteredTickets = useMemo(() => {
    return enrichedTickets.filter((ticket) => {
      const term = searchTerm.toLowerCase();
      return (
        ticket.id.toLowerCase().includes(term) ||
        (ticket.attendeeName || '').toLowerCase().includes(term) ||
        (ticket.package || '').toLowerCase().includes(term) ||
        (ticket.eventName || '').toLowerCase().includes(term) ||
        (ticket.vendorName || '').toLowerCase().includes(term) ||
        (ticket.transactionReference || '').toLowerCase().includes(term)
      );
    });
  }, [enrichedTickets, searchTerm]);

  const selectedEvent = useMemo(() => {
    if (!selectedTicket || !events) return null;
    return events.find((e) => e.id === selectedTicket.eventId) || null;
  }, [selectedTicket, events]);

  useEffect(() => {
    if (selectedTicket?.id && selectedTicket?.eventId && selectedTicket?.userId) {
      const generateQrCode = async () => {
        try {
          const validationUrl = `${window.location.origin}/validate?ticketId=${selectedTicket.id}&eventId=${selectedTicket.eventId}&userId=${selectedTicket.userId}`;
          const url = await QRCode.toDataURL(validationUrl, {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 256,
            color: { dark: '#000000', light: '#FFFFFF' },
          });
          setQrCodeUrl(url);
        } catch (err) {
          console.error('Could not generate QR code', err);
        }
      };
      generateQrCode();
    } else {
      setQrCodeUrl('');
    }
  }, [selectedTicket]);

  const handleDownload = useCallback((formatType: 'jpg' | 'pdf') => {
    const node = document.getElementById('admin-ticket-to-download');
    if (!node) return;

    const imageOptions = { 
      quality: 0.98, 
      cacheBust: true,
      fetchRequestInit: {
        mode: 'cors' as RequestMode,
        credentials: 'omit' as RequestCredentials
      }
    };

    toast({ 
      title: 'Preparing Download...', 
      description: `Generating the ticket ${formatType.toUpperCase()} file.` 
    });

    toJpeg(node, imageOptions)
      .then((dataUrl) => {
        if (formatType === 'jpg') {
          const link = document.createElement('a');
          link.download = `ticket-${selectedTicket?.id}.jpg`;
          link.href = dataUrl;
          link.click();
        } else {
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'px',
            format: [node.offsetWidth + 20, node.offsetHeight + 20]
          });
          pdf.addImage(dataUrl, 'PNG', 10, 10, node.offsetWidth, node.offsetHeight);
          pdf.save(`ticket-${selectedTicket?.id}.pdf`);
        }
      })
      .catch((err) => {
        console.error('Download failed', err);
        toast({ 
          variant: 'destructive', 
          title: 'Download Failed', 
          description: 'Could not generate ticket image.' 
        });
      });
  }, [selectedTicket, toast]);

  const handleViewDetails = (ticket: any) => {
    setSelectedTicket(ticket);
    setIsDetailsOpen(true);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">All Tickets</h1>
        <p className="text-muted-foreground">Manage and audit all tickets published or purchased on the platform.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tickets Directory</CardTitle>
          <CardDescription>
            A comprehensive list of all tickets including attendees, event packages, check-in status, and payment references.
          </CardDescription>
          <div className="pt-4 relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by ID, user, event, or ref..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket ID</TableHead>
                <TableHead>Attendee</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Purchased On</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredTickets.length > 0 ? (
                filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-mono text-xs">{ticket.id.substring(0, 8)}...</TableCell>
                    <TableCell>{ticket.attendeeName || 'Guest'}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{ticket.vendorName}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{ticket.eventName}</TableCell>
                    <TableCell><Badge variant="outline">{ticket.package}</Badge></TableCell>
                    <TableCell>
                      {ticket.scans > 0 ? (
                        <Badge variant="secondary" className="text-green-600 border-green-600">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Scanned ({ticket.scans}/{ticket.maxScans})
                        </Badge>
                      ) : (
                        <Badge variant="outline">Unscanned</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {ticket.purchaseDate ? format(parseISO(ticket.purchaseDate), 'MMM d, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(ticket)}>
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    No tickets found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TicketIcon className="h-5 w-5 text-primary" /> Ticket Details & Preview
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              ID: {selectedTicket?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="grid md:grid-cols-2 gap-6 pt-4 items-start max-h-[80vh] overflow-y-auto pr-2">
              {/* Left Column: Visual Ticket Design and Download Actions */}
              <div className="flex flex-col items-center gap-4 bg-secondary/10 p-4 rounded-xl border border-border/40">
                <div id="admin-ticket-to-download" ref={ticketRef} className="scale-90 origin-top md:scale-100 flex justify-center w-full">
                  {selectedEvent ? (
                    <TicketDesign
                      eventData={selectedEvent}
                      ticketData={selectedTicket}
                      qrCodeUrl={qrCodeUrl}
                      user={null}
                    />
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      No event data to preview ticket.
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 w-full pt-2">
                  <Button variant="outline" size="sm" onClick={() => handleDownload('jpg')} disabled={!selectedEvent}>
                    <FileImage className="mr-1.5 h-4 w-4" /> Download JPG
                  </Button>
                  <Button size="sm" onClick={() => handleDownload('pdf')} disabled={!selectedEvent}>
                    <FileText className="mr-1.5 h-4 w-4" /> Download PDF
                  </Button>
                </div>
              </div>

              {/* Right Column: Ticket Metadata */}
              <div className="space-y-6">
                {/* Attendee Profile Section */}
                <div className="bg-secondary/40 rounded-lg p-4 flex items-center gap-3">
                  <div className="bg-primary/10 p-2.5 rounded-full">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Attendee Information</h4>
                    <p className="text-sm text-foreground">{selectedTicket.attendeeName || 'Guest Attendee'}</p>
                    <p className="text-xs text-muted-foreground">User ID: {selectedTicket.userId}</p>
                  </div>
                </div>

                {/* Event Info */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Event Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Event Name</span>
                      <span className="font-medium text-foreground">{(selectedTicket as any).eventName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Date</span>
                      <span className="font-medium text-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {(selectedTicket as any).eventDate
                          ? format(parseISO((selectedTicket as any).eventDate), 'PPP')
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground block">Location</span>
                      <span className="font-medium text-foreground">{(selectedTicket as any).eventLocation}</span>
                    </div>
                  </div>
                </div>

                {/* Ticket Pricing Details */}
                <div className="border-t pt-4 space-y-2">
                  <h4 className="font-semibold text-sm">Financials & Package</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Package</span>
                      <span className="font-medium text-foreground">{selectedTicket.package}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Paid Amount</span>
                      <span className="font-semibold text-foreground flex items-center">
                        ₦{selectedTicket.price?.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Payment Gateway</span>
                      <span className="font-medium text-foreground uppercase">{selectedTicket.paymentGateway || 'N/A'}</span>
                    </div>
                    {selectedTicket.platformFeeAmount !== undefined && (
                      <div>
                        <span className="text-muted-foreground block">Platform Fee</span>
                        <span className="font-medium text-foreground text-destructive">
                          ₦{selectedTicket.platformFeeAmount?.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {selectedTicket.vendorNetAmount !== undefined && (
                      <div>
                        <span className="text-muted-foreground block">Vendor Net</span>
                        <span className="font-semibold text-green-600">
                          ₦{selectedTicket.vendorNetAmount?.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Transaction details */}
                <div className="border-t pt-4 space-y-2">
                  <h4 className="font-semibold text-sm">Audit & References</h4>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Reference:</span>{' '}
                      <span className="font-mono">{selectedTicket.transactionReference || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Vendor ID:</span>{' '}
                      <span className="font-mono">{selectedTicket.vendorId || 'N/A'}</span>
                    </div>
                    {selectedTicket.purchaseDate && (
                      <div>
                        <span className="text-muted-foreground">Purchase Date:</span>{' '}
                        <span>{format(parseISO(selectedTicket.purchaseDate), 'PPP p')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Validation/Scans details */}
                <div className="border-t pt-4 space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-1.5">
                    <ScanLine className="h-4 w-4" /> Validation Activity
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Scan Count</span>
                      <span className="font-semibold text-foreground">
                        {selectedTicket.scans || 0} / {selectedTicket.maxScans || 1}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Status</span>
                      {selectedTicket.scans > 0 ? (
                        <Badge variant="secondary" className="text-green-600 border-green-600 mt-0.5">
                          Checked In
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="mt-0.5">
                          Ready
                        </Badge>
                      )}
                    </div>
                    {selectedTicket.scans > 0 && selectedTicket.lastScannedAt && (
                      <div className="col-span-2 flex items-center text-muted-foreground gap-1 text-[11px]">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          Last scanned: {format(parseISO(selectedTicket.lastScannedAt), 'PPP p')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
