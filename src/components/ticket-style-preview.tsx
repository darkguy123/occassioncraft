
'use client';

import type { TicketFormValues } from '@/app/create-ticket/page';
import { Card } from '@/components/ui/card';
import { Ticket, MapPin, Calendar, User } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Skeleton } from './ui/skeleton';

interface TicketStylePreviewProps {
    eventData: Partial<TicketFormValues>;
}

const BrutalistTicketTemplate = ({ eventData, qrCodeUrl }: { eventData: Partial<TicketFormValues>, qrCodeUrl: string }) => {
    const { name, date, ticketBrandingImageUrl, attendeeName } = eventData;
    const formattedDate = date ? format(date, "dd.MM.yy") : '24.09.24';
    const formattedMonth = date ? format(date, "MMMM").toUpperCase() : 'SEPTEMBER';
    const price = eventData.price ? `$${eventData.price}` : '25$';

    return (
        <div className="w-full max-w-2xl mx-auto rounded-lg overflow-hidden shadow-2xl bg-[#101828] text-white font-sans">
            <div className="flex">
                {/* Left Stub */}
                <div className="w-1/4 bg-white text-black p-4 flex flex-col justify-between items-center relative">
                    <div className="absolute top-4 left-0 right-0 px-2">
                        {/* Barcode simulation */}
                        <div className="flex justify-between items-end h-8">
                            <div className="w-1 bg-black h-full"></div>
                            <div className="w-0.5 bg-black h-3/4"></div>
                            <div className="w-1 bg-black h-full"></div>
                            <div className="w-1 bg-black h-1/2"></div>
                            <div className="w-0.5 bg-black h-full"></div>
                            <div className="w-0.5 bg-black h-3/4"></div>
                            <div className="w-1 bg-black h-full"></div>
                             <div className="w-0.5 bg-black h-1/2"></div>
                            <div className="w-1 bg-black h-full"></div>
                            <div className="w-1 bg-black h-3/4"></div>
                        </div>
                        <p className="text-[5px] leading-tight mt-1 text-gray-600">
                            Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy.
                        </p>
                    </div>

                    <div className="font-bold text-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <p className="text-lg">{formattedDate}</p>
                        <p className="text-xs tracking-widest">{formattedMonth}</p>
                    </div>

                    <div className="w-full flex justify-between items-end absolute bottom-4 px-4">
                        <p className="font-bold text-5xl [writing-mode:vertical-rl] rotate-180">TICKET</p>
                        <p className="font-bold text-lg">{price}</p>
                    </div>

                </div>

                {/* Main Body */}
                <div className="w-3/4 p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center">
                            {/* Geometric shapes */}
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center">
                                    <div className="w-4 h-4 rounded-full border border-white flex items-center justify-center">
                                         <div className="w-1 h-1 rounded-full bg-white"></div>
                                    </div>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                                <div className="w-2 h-2 bg-white transform rotate-45"></div>
                                <div className="w-2 h-2 bg-white transform rotate-45"></div>
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 0L7.854 4.146L12 6L7.854 7.854L6 12L4.146 7.854L0 6L4.146 4.146L6 0Z" fill="white"/></svg>
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 0L7.854 4.146L12 6L7.854 7.854L6 12L4.146 7.854L0 6L4.146 4.146L6 0Z" fill="white"/></svg>
                            </div>
                            {/* QR Code */}
                            {qrCodeUrl && (
                                <div className="bg-white p-1 rounded-md shadow-lg">
                                    <Image src={qrCodeUrl} alt="QR Code" width={64} height={64} />
                                </div>
                            )}
                        </div>
                        <div className="mt-4">
                             <h2 className="text-xl font-semibold tracking-wider">
                                {name || "ART SUNSET FEST"}
                             </h2>
                            <h1 className="text-6xl font-extrabold text-pink-500 -ml-1">
                                {attendeeName || "BRUTALISM"}
                            </h1>
                        </div>
                    </div>
                     <div className="flex items-center gap-2 font-bold text-2xl text-white/80 self-end">
                        <span>&gt;</span><span>&gt;</span><span>&gt;</span><span>&gt;</span><span>&gt;</span><span>&gt;</span>
                    </div>
                </div>
            </div>
        </div>
    );
}


const ModernTicketTemplate = ({ eventData, qrCodeUrl }: { eventData: Partial<TicketFormValues>, qrCodeUrl: string }) => {
    // A sleek, modern design
    return (
         <Card className="w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl bg-zinc-800 text-white relative">
            {eventData.ticketImageUrl && <Image src={eventData.ticketImageUrl} alt="background" fill className="object-cover opacity-20" />}
            <div className="relative z-10 p-6">
                 {eventData.ticketBrandingImageUrl && <Image src={eventData.ticketBrandingImageUrl} alt="branding" width={120} height={40} className="mb-4" />}
                <h3 className="font-sans text-4xl font-bold tracking-tighter">{eventData.name || 'Event Name'}</h3>
                <p className="text-zinc-400">{eventData.attendeeName || 'Ticket Holder'}</p>
                <div className="mt-6 flex justify-between items-center">
                    {qrCodeUrl ? <div className="bg-white p-1 rounded-md"><Image src={qrCodeUrl} alt="QR Code" width={100} height={100} /></div> : <Skeleton className="h-24 w-24" />}
                    <div className="text-right">
                        <p className="text-zinc-400 text-sm">Date</p>
                        <p className="font-semibold">{eventData.date ? format(eventData.date, "dd MMM yyyy") : '01 Jan 2025'}</p>
                        <p className="text-zinc-400 text-sm mt-2">Location</p>
                        <p className="font-semibold w-32 truncate">{eventData.location || 'Venue Name'}</p>
                    </div>
                </div>
            </div>
        </Card>
    );
};

const MinimalTicketTemplate = ({ eventData, qrCodeUrl }: { eventData: Partial<TicketFormValues>, qrCodeUrl: string }) => {
    // A clean, minimal design
    return (
        <Card className="w-full max-w-md mx-auto rounded-lg shadow-2xl bg-white text-black font-serif relative">
            {eventData.ticketImageUrl && <Image src={eventData.ticketImageUrl} alt="background" fill className="object-cover opacity-10" />}
            <div className="relative z-10 p-8">
                <div className="text-center mb-6">
                    {eventData.ticketBrandingImageUrl && <Image src={eventData.ticketBrandingImageUrl} alt="branding" width={80} height={80} className="mx-auto mb-2 rounded-full" />}
                    <p className="text-sm tracking-[0.2em] uppercase text-gray-500">Admit One</p>
                    <h3 className="text-3xl font-bold">{eventData.name || 'Event Name'}</h3>
                </div>
                <div className="border-t border-b border-dashed border-gray-300 py-4 my-4 flex justify-between text-center">
                    <div>
                        <p className="text-xs text-gray-500">Date</p>
                        <p className="font-bold">{eventData.date ? format(eventData.date, "dd MMM") : 'Jan 01'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Time</p>
                        <p className="font-bold">{eventData.startTime || '8:00 PM'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Location</p>
                        <p className="font-bold truncate max-w-24">{eventData.location || 'Venue'}</p>
                    </div>
                </div>
                <div className="text-center">
                     {qrCodeUrl ? <Image src={qrCodeUrl} alt="QR Code" width={120} height={120} className="mx-auto" /> : <Skeleton className="h-32 w-32 mx-auto" />}
                </div>
            </div>
        </Card>
    );
};



export function TicketStylePreview({ eventData }: TicketStylePreviewProps) {
    const { templateId, guestPhotoUrl, package: ticketPackage } = eventData;
    const [qrCodeUrl, setQrCodeUrl] = useState('');

    useEffect(() => {
        const generateQrCode = async () => {
            try {
                const url = await QRCode.toDataURL('sample-ticket-id-preview', {
                    errorCorrectionLevel: 'H', margin: 1, width: 200,
                });
                setQrCodeUrl(url);
            } catch (err) {
                console.error('Could not generate QR code', err);
            }
        };
        generateQrCode();
    }, []);
    
    const renderContent = () => {
        const props = { eventData, qrCodeUrl };
         if (templateId === 'classic') return <BrutalistTicketTemplate {...props} />;
         if (templateId === 'modern') return <ModernTicketTemplate {...props} />;
         if (templateId === 'minimal') return <MinimalTicketTemplate {...props} />;

        // Default or Regular ticket preview
        return (
            <Card className="w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-800 dark:to-slate-900 relative">
                {eventData.ticketImageUrl && <Image src={eventData.ticketImageUrl} alt="background" fill className="object-cover opacity-30" />}
                 <div className="relative z-10 p-8">
                     <div className="flex justify-between items-start">
                        <div>
                             <p className="text-xs uppercase tracking-widest text-black/60 dark:text-white/60">Event Ticket</p>
                             <h3 className="font-headline text-3xl font-bold leading-tight text-black dark:text-white">{eventData.name || 'Your Event Title'}</h3>
                        </div>
                        <Ticket className="h-8 w-8 text-black/60 dark:text-white/60" />
                    </div>

                    <div className="mt-8 space-y-4 text-sm">
                        <div className="flex items-center gap-3"><Calendar className="h-4 w-4 shrink-0 text-black/60 dark:text-white/60" /><span className="font-medium text-black dark:text-white">{eventData.date ? format(eventData.date, "EEEE, MMM d, yyyy") : 'Your Date'} at {eventData.startTime || 'Your Time'}</span></div>
                        <div className="flex items-center gap-3"><MapPin className="h-4 w-4 shrink-0 text-black/60 dark:text-white/60" /><span className="truncate font-medium text-black dark:text-white">{eventData.location || 'Your Location'}</span></div>
                        <div className="flex items-center gap-3"><User className="h-4 w-4 shrink-0 text-black/60 dark:text-white/60" /><span className="truncate font-medium text-black dark:text-white">{eventData.attendeeName || 'Ticket Holder'}</span></div>
                    </div>
                     
                    <div className="mt-8 text-center flex flex-col items-center justify-center">
                        {ticketPackage === 'Premium Individual' && guestPhotoUrl && (
                            <div className="mb-4">
                                <Image src={guestPhotoUrl} alt="Guest" width={80} height={80} className="rounded-full h-20 w-20 object-cover border-2 border-white shadow-lg" />
                            </div>
                        )}
                        {qrCodeUrl ? <div className="bg-white p-2 rounded-lg shadow-lg"><Image src={qrCodeUrl} alt="Ticket QR Code" width={200} height={200} /></div> : <Skeleton className="h-48 w-48" />}
                        <p className="text-xs mt-3 text-black/60 dark:text-white/60">Scan this at the event entrance</p>
                    </div>

                 </div>
            </Card>
        );
    }

    return <div>{renderContent()}</div>;

}
