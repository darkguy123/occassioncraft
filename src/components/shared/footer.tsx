
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 1.4 3.3 4.4 3.3 4.4s-1.4 1.4-2.8 2.1c.1 2.3.1 4.3.1 6.2 0 6.1-4.1 10.6-10.6 10.6-5.2 0-8-3.3-8-3.3s3.1 1.4 5.7.1c-3.1-.6-5.2-3.3-5.2-3.3s.7.1 1.4.1c-2.3-.6-4.1-2.3-4.1-4.5 0 0 .7.4 1.4.4C3.1 13.4 1.4 8.8 1.4 8.8s1.6 2.8 5.7 2.8c-.1-2.3.1-4.3.1-4.3s1.4-3.7 4.5-3.7c1.4 0 2.8.6 2.8.6s-1.2-.4-1.2-1.2c0 0 .5-1.4 2.8-1.4z"></path></svg>
)

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
)

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
)

const DEFAULT_LOGO_URL = 'https://firebasestorage.googleapis.com/v0/b/studio-8569439258-4b916.firebasestorage.app/o/public%2Fassets%2Fremove-photos-background-removed%20(1).png?alt=media&token=e95cb4d3-18c7-48b8-93f8-656354e39a3f';

export function Footer() {
  const { siteSettings, isSiteSettingsLoading } = useFirebase();

  const logoUrl = siteSettings?.logoUrl || DEFAULT_LOGO_URL;
  const socials = {
    twitter: siteSettings?.twitterUrl || '#',
    facebook: siteSettings?.facebookUrl || '#',
    instagram: siteSettings?.instagramUrl || '#',
  };

  return (
    <footer className="bg-gradient-to-r from-[#336BFC] to-[#1e40af] text-white border-t border-t-white/10">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2">
              {isSiteSettingsLoading ? (
                  <div className="h-8 w-36 bg-white/20 rounded-md animate-pulse" />
              ) : (
                <Image src={logoUrl} alt="OccasionCraft Logo" width={140} height={32} className="h-8 w-auto" />
              )}
            </Link>
            <p className="text-sm text-white/80">Create, discover, and celebrate events with OccasionCraft.</p>
            <div className="flex space-x-4">
                <Link href={socials.twitter} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white"><TwitterIcon className="h-5 w-5"/></Link>
                <Link href={socials.facebook} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white"><FacebookIcon className="h-5 w-5"/></Link>
                <Link href={socials.instagram} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white"><InstagramIcon className="h-5 w-5"/></Link>
            </div>
          </div>

          <div>
            <h3 className="font-headline font-semibold mb-4">For Users</h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li><Link href="/events" className="hover:text-white">Discover Events</Link></li>
              <li><Link href="/login" className="hover:text-white">Log In</Link></li>
              <li><Link href="/signup" className="hover:text-white">Sign Up</Link></li>
              <li><Link href="/help-center" className="hover:text-white">Help Center</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-headline font-semibold mb-4">For Vendors</h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li><Link href="/vendor" className="hover:text-white">Host Your Event</Link></li>
              <li><Link href="/create-event" className="hover:text-white">Create Event</Link></li>
              <li><Link href="/vendor/dashboard" className="hover:text-white">Vendor Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-headline font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li><Link href="/about" className="hover:text-white">About Us</Link></li>
              <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white">Terms of Use</Link></li>
              <li><Link href="/help-center" className="hover:text-white">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-t-white/10 text-center text-sm text-white/60">
          <p>&copy; {new Date().getFullYear()} OccasionCraft. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
