
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { Facebook, Instagram } from 'lucide-react';
import { XIcon } from '@/components/icons/x-icon';

const DEFAULT_LOGO_URL = '/recommenoptimized.svg'; // Path relative to the /public directory

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
                <Image src={logoUrl} alt="OccasionCraft Logo" width={140} height={32} className="h-8 w-auto" unoptimized/>
              )}
            </Link>
            <p className="text-sm text-white/80">Create, discover, and celebrate events with OccasionCraft.</p>
            <div className="flex space-x-4">
                <Link href={socials.twitter} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white"><XIcon className="h-5 w-5"/></Link>
                <Link href={socials.facebook} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white"><Facebook className="h-5 w-5"/></Link>
                <Link href={socials.instagram} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white"><Instagram className="h-5 w-5"/></Link>
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
              <li><Link href="/delete-my-data" className="hover:text-white">Delete My Data</Link></li>
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
