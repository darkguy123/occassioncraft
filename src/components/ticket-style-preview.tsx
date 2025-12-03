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

const GeometricTicketTemplate = ({ eventData, qrCodeUrl }: { eventData: Partial<TicketFormValues>, qrCodeUrl: string }) => {
    const { name, date, startTime, location, attendeeName } = eventData;
    const formattedDate = date ? format(date, "MMM dd, yyyy") : 'Jan 01, 2025';
    const formattedTime = startTime || '8:00 PM';

    const Barcode = () => (
        <div className="flex flex-col items-center space-y-[2px] w-8">
            <div className="h-12 w-full bg-white" style={{
                clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 90%, 5% 90%, 5% 85%, 0% 85%, 0% 75%, 10% 75%, 10% 70%, 0% 70%, 0% 60%, 5% 60%, 5% 55%, 0% 55%, 0% 45%, 10% 45%, 10% 40%, 0% 40%, 0% 30%, 5% 30%, 5% 25%, 0% 25%, 0% 15%, 10% 15%, 10% 10%, 0% 10%)'
            }}></div>
            <p className="text-white text-[8px] tracking-[2px]">12345678</p>
        </div>
    );
    
    const ScallopedEdge = () => (
        <div className="absolute inset-y-0 -left-3 w-6 bg-transparent">
            <div className="h-full w-full" style={{
                backgroundImage: 'radial-gradient(circle at 100% 50%, transparent 8px, #0f172a 9px)',
                backgroundSize: '100% 20px',
            }}></div>
        </div>
    )

    return (
        <div className="w-full max-w-lg mx-auto rounded-lg shadow-2xl bg-slate-900 text-white font-sans relative overflow-hidden aspect-[2/1]">
            <div className="absolute -right-2 top-0 h-full w-4 bg-slate-900 z-20"></div>
            <div className="absolute -left-2 top-0 h-full w-4 bg-slate-900 z-20"></div>
            
            {/* Scalloped Edges */}
            <div className="absolute inset-y-0 -left-3 w-6 bg-transparent z-10">
                <div className="h-full w-full" style={{ backgroundImage: 'radial-gradient(circle at 100% 50%, transparent 9px, #0f172a 10px)', backgroundSize: '100% 24px' }}></div>
            </div>
             <div className="absolute inset-y-0 -right-3 w-6 bg-transparent z-10">
                <div className="h-full w-full" style={{ backgroundImage: 'radial-gradient(circle at 0% 50%, transparent 9px, #0f172a 10px)', backgroundSize: '100% 24px' }}></div>
            </div>


            {/* Geometric Pattern */}
            <div className="absolute top-0 right-0 h-2/3 w-1/2 opacity-80 z-0">
                <div className="absolute top-0 right-12 w-24 h-24 rounded-full bg-blue-500/30"></div>
                <div className="absolute top-8 right-0 w-20 h-20 rounded-tl-full bg-purple-500/40"></div>
                <div className="absolute top-16 right-16 w-16 h-16 bg-sky-400/50" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
                <div className="absolute top-4 right-20 w-8 h-8 border-2 border-purple-400"></div>
            </div>

            <div className="relative z-10 p-6 h-full flex flex-col justify-between">
                <div>
                    <h3 className="font-bold text-2xl tracking-wide">{name || 'Your Event Name'}</h3>
                    <p className="text-white/70">{attendeeName || 'Ticket Holder'}</p>
                </div>
                <div className="flex justify-between items-end">
                    <div className="text-sm">
                        <p className="font-semibold">{formattedDate}</p>
                        <p className="text-white/70">{formattedTime} &bull; {location || 'Venue'}</p>
                    </div>
                     <div className="flex items-center gap-4">
                        {qrCodeUrl ? (
                            <div className="bg-white p-1 rounded-md">
                                <Image src={qrCodeUrl} alt="QR Code" width={72} height={72} />
                            </div>
                        ) : (
                            <Skeleton className="w-[80px] h-[80px]" />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


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
         if (templateId === 'classic') return <GeometricTicketTemplate {...props} />;
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
