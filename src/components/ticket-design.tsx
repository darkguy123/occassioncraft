'use client';

import { Card } from '@/components/ui/card';
import { Ticket as TicketIcon, MapPin, Calendar, User as UserIcon } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';
import type { Event, Ticket } from '@/lib/types';
import { User } from 'firebase/auth';

const DEFAULT_LOGO_URL = 'https://firebasestorage.googleapis.com/v0/b/studio-8569439258-4b916.firebasestorage.app/o/public%2Fassets%2Fremove-photos-background-removed%20(1).png?alt=media&token=e95cb4d3-18c7-48b8-93f8-656354e39a3f';


export const TicketDesign = ({ eventData, ticketData, qrCodeUrl, user }: { eventData: Event, ticketData: Ticket, qrCodeUrl: string, user: User | null }) => {
    const firstDate = eventData.dates?.[0];
    const formattedDate = firstDate?.date ? format(new Date(firstDate.date), "EEEE, MMM d, yyyy") : 'Date';
    const formattedTime = firstDate?.startTime || 'Time';
    
    return (
        <Card id="ticket-to-download" className={cn(
            "w-full max-w-md rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br relative transition-all duration-300 from-slate-50 to-slate-200 dark:from-slate-800 dark:to-slate-900"
        )}>
            {ticketData?.ticketImageUrl && (
                <Image src={ticketData.ticketImageUrl} alt="Ticket background" fill className="object-cover blur-md opacity-50" />
            )}

            <div className="p-1 backdrop-blur-sm bg-white/10 rounded-2xl relative z-10">
                {ticketData?.ticketBrandingImageUrl && (
                    <div className="h-24 relative rounded-t-xl overflow-hidden mb-2">
                        <Image src={ticketData.ticketBrandingImageUrl} alt="Branding" fill className="object-cover" />
                    </div>
                )}

                <div className={cn("p-6 md:p-8", ticketData?.ticketBrandingImageUrl && "pt-2")}>

                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-widest text-black/60 dark:text-white/60">Event Ticket • {ticketData.package}</p>
                            <h3 className="font-headline text-3xl font-bold leading-tight text-black dark:text-white">{eventData.name}</h3>
                        </div>
                        <TicketIcon className="h-8 w-8 text-black/60 dark:text-white/60" />
                    </div>

                    <div className="mt-8 space-y-4 text-sm">
                        <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 shrink-0 text-black/60 dark:text-white/60" />
                            <span className="font-medium text-black dark:text-white">{formattedDate} at {formattedTime}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 shrink-0 text-black/60 dark:text-white/60" />
                            <span className="truncate font-medium text-black dark:text-white">{eventData.isOnline ? 'Online Event' : eventData.location}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <UserIcon className="h-4 w-4 shrink-0 text-black/60 dark:text-white/60" />
                            <span className="truncate font-medium text-black dark:text-white">{ticketData.attendeeName || user?.displayName || 'Ticket Holder'}</span>
                        </div>
                         <div className="mt-2 p-2 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 inline-block">
                            <p className="font-headline font-bold text-sm text-black dark:text-white uppercase">
                                {ticketData.price === 0 ? 'FREE TICKET' : `PRICE: ₦${ticketData.price?.toLocaleString()}`}
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 text-center flex flex-col items-center justify-center">
                        {ticketData.package === 'Personal' && ticketData.guestPhotoUrl && (
                            <div className="mb-4">
                                <Image src={ticketData.guestPhotoUrl} alt="Guest" width={80} height={80} className="rounded-full h-20 w-20 object-cover border-2 border-white shadow-lg" />
                            </div>
                        )}
                        {qrCodeUrl ? (
                            <div className="bg-white p-2 rounded-lg shadow-lg">
                                <Image
                                    src={qrCodeUrl}
                                    alt="Ticket QR Code"
                                    width={200}
                                    height={200}
                                    data-ai-hint="qr code"
                                />
                            </div>
                        ) : (
                            <Skeleton className="h-48 w-48" />
                        )}
                        <p className="text-xs mt-3 text-black/60 dark:text-white/60">Scan this at the event entrance</p>
                    </div>

                    <div className="mt-8 border-t-2 border-dashed border-black/20 dark:border-white/20 pt-4 flex items-center justify-between gap-4 text-xs">
                        <Image src={DEFAULT_LOGO_URL} alt="Logo" width={80} height={20} className="h-5 w-auto" />
                        <p className="text-black/60 dark:text-white/60">ID: {ticketData.id.substring(0, 13)}</p>
                    </div>
                </div>
            </div>
        </Card>
    );
};
