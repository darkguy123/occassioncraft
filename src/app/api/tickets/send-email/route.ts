import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { adminDb } from '@/lib/firebase-admin';
import { format } from 'date-fns';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || '',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT || '465') === 465,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

export async function POST(req: Request) {
  try {
    const { ticketId, eventId, userId, vendorId } = await req.json();

    if (!ticketId || !eventId || !userId || !vendorId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Fetch required data from Firestore separately
    const [ticketSnap, eventSnap, userSnap, vendorSnap] = await Promise.all([
      adminDb.collection('tickets').doc(ticketId).get(),
      adminDb.collection('events').doc(eventId).get(),
      adminDb.collection('users').doc(userId).get(),
      adminDb.collection('vendors').doc(vendorId).get(),
    ]);

    if (!ticketSnap.exists || !eventSnap.exists || !userSnap.exists || !vendorSnap.exists) {
      return NextResponse.json({ error: 'One or more referenced documents not found' }, { status: 404 });
    }

    const ticket = ticketSnap.data()!;
    const event = eventSnap.data()!;
    const buyer = userSnap.data()!;
    const vendor = vendorSnap.data()!;

    // Formatting Date
    const firstDateItem = event.dates?.[0];
    const eventDateStr = firstDateItem 
        ? format(new Date(firstDateItem.date), "EEEE, MMMM d, yyyy") 
        : 'Date TBA';
    const eventTimeStr = firstDateItem?.startTime || 'Time TBA';
    const eventLocation = event.isOnline ? 'Online Event' : (event.location || 'Location TBA');
    
    // Website URL for the ticket link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
    const ticketUrl = `${baseUrl}/events/${eventId}/tickets/${ticketId}`;

    const buyerEmailHtml = `
      <div style="font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 40px 10px; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          ${event.bannerUrl ? `<img src="${event.bannerUrl}" alt="${event.name}" style="width: 100%; height: 200px; object-fit: cover;" />` : ''}
          <div style="padding: 30px;">
            <h1 style="margin-top: 0; color: #111827; font-size: 24px;">Your Ticket is Ready! 🎉</h1>
            <p style="font-size: 16px; color: #4B5563;">Hi ${buyer.firstName || 'there'},</p>
            <p style="font-size: 16px; color: #4B5563;">Thank you for your purchase. We are thrilled to have you at <strong>${event.name}</strong>.</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h2 style="margin-top: 0; font-size: 18px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Ticket Details</h2>
                <table style="width: 100%; font-size: 15px; color: #334155;">
                    <tr><td style="padding: 6px 0;"><strong>Event:</strong></td><td style="padding: 6px 0; text-align: right;">${event.name}</td></tr>
                    <tr><td style="padding: 6px 0;"><strong>Date:</strong></td><td style="padding: 6px 0; text-align: right;">${eventDateStr}</td></tr>
                    <tr><td style="padding: 6px 0;"><strong>Time:</strong></td><td style="padding: 6px 0; text-align: right;">${eventTimeStr}</td></tr>
                    <tr><td style="padding: 6px 0;"><strong>Location:</strong></td><td style="padding: 6px 0; text-align: right;">${eventLocation}</td></tr>
                    <tr><td style="padding: 6px 0;"><strong>Package:</strong></td><td style="padding: 6px 0; text-align: right;">${ticket.package || 'Standard'}</td></tr>
                    <tr><td style="padding: 6px 0; border-top: 1px dashed #cbd5e1;"><strong>Amount Paid:</strong></td><td style="padding: 6px 0; text-align: right; border-top: 1px dashed #cbd5e1;"><strong>${ticket.price === 0 ? 'FREE' : `₦${ticket.price.toLocaleString()}`}</strong></td></tr>
                </table>
            </div>

            <div style="text-align: center; margin-top: 30px;">
                <a href="${ticketUrl}" style="background-color: #0f172a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">View & Download Ticket</a>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: #64748b; text-align: center;">
              If you have any questions, please contact the organizer at ${vendor.contactEmail}.<br>
              See you there!
            </p>
          </div>
        </div>
      </div>
    `;

    const vendorEmailHtml = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>New Ticket Sale! 🎟️</h2>
        <p>Good news! You just sold a new ticket for <strong>${event.name}</strong>.</p>
        <ul>
            <li><strong>Buyer:</strong> ${buyer.firstName} ${buyer.lastName || ''} (${buyer.email})</li>
            <li><strong>Package:</strong> ${ticket.package || 'Standard'}</li>
            <li><strong>Amount:</strong> ${ticket.price === 0 ? 'FREE' : `₦${ticket.price.toLocaleString()}`}</li>
            <li><strong>Ticket ID:</strong> ${ticketId}</li>
        </ul>
        <p>Keep up the great work!</p>
      </div>
    `;

    const vendorEmail = vendor.contactEmail;
    const buyerEmail = buyer.email;

    // Send emails in parallel
    const emailPromises = [];

    // Only attempt to send if SMTP is configured to avoid crashes locally if not setup yet
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        if (buyerEmail) {
        emailPromises.push(
            transporter.sendMail({
            from: process.env.SMTP_FROM_EMAIL || '"OccassionCraft" <noreply@occassioncraft.com>',
            to: buyerEmail,
            subject: `Your ticket for ${event.name} is ready!`,
            html: buyerEmailHtml,
            }).catch(err => console.error("Failed to send buyer email:", err))
        );
        }

        if (vendorEmail) {
        emailPromises.push(
            transporter.sendMail({
            from: process.env.SMTP_FROM_EMAIL || '"OccassionCraft" <noreply@occassioncraft.com>',
            to: vendorEmail,
            subject: `New Ticket Sale: ${event.name}`,
            html: vendorEmailHtml,
            }).catch(err => console.error("Failed to send vendor email:", err))
        );
        }

        await Promise.all(emailPromises);
    } else {
        console.warn('SMTP is not fully configured in env variables, skipping email sending.');
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
