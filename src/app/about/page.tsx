
'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';

export default function AboutUsPage() {
  const { siteSettings, isSiteSettingsLoading } = useFirebase();

  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
        <h1 className="text-4xl font-bold font-headline mb-6">About Us</h1>
        <div className="prose dark:prose-invert max-w-none">
            {isSiteSettingsLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
            ) : (
                <p className="whitespace-pre-wrap">{siteSettings?.aboutUs || 'About Us content has not been set by an admin yet.'}</p>
            )}
        </div>
    </div>
  );
}
