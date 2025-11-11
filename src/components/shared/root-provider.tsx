
'use client';

import { Header } from '@/components/shared/header';
import { Footer } from '@/components/shared/footer';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { LoaderProvider } from '@/context/loader-context';
import { PageLoader } from '@/components/shared/page-loader';
import { NavigationEvents } from '@/components/shared/navigation-events';
import { Suspense, useState, useEffect } from 'react';
import { ThemeProvider } from '@/context/theme-provider';

function Favicon() {
    const [faviconUrl, setFaviconUrl] = useState("/favicon.ico");

    useEffect(() => {
        const loadFavicon = () => {
            const savedFavicon = localStorage.getItem('websiteFavicon');
            if (savedFavicon) {
                setFaviconUrl(savedFavicon);
            } else {
                setFaviconUrl('/favicon.ico');
            }
        };

        loadFavicon();

        const handleStorageChange = () => {
            loadFavicon();
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    return <link rel="icon" href={faviconUrl} />;
}

export function RootProvider({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
          <Suspense fallback={<link rel="icon" href="/favicon.ico" />}>
             <Favicon />
          </Suspense>
          <FirebaseClientProvider>
            <LoaderProvider>
              <Header />
              <main className="flex-grow">{children}</main>
              <Footer />
              <Toaster />
              <PageLoader />
              <Suspense fallback={null}>
                <NavigationEvents />
              </Suspense>
            </LoaderProvider>
          </FirebaseClientProvider>
        </ThemeProvider>
    );
}
