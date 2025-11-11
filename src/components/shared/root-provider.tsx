
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
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

function Favicon() {
    const [faviconUrl, setFaviconUrl] = useState("/favicon.png");
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        if (!hasMounted) return;

        const loadFavicon = () => {
            const savedFavicon = localStorage.getItem('websiteFavicon');
            if (savedFavicon) {
                setFaviconUrl(savedFavicon);
            } else {
                setFaviconUrl('/favicon.png');
            }
        };

        loadFavicon();

        const handleStorageChange = () => {
            loadFavicon();
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [hasMounted]);

    if (!hasMounted) {
      // Render nothing on the server to prevent hydration mismatch
      return null;
    }

    return <link rel="icon" href={faviconUrl} />;
}

export function RootProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <ThemeProvider>
          <Suspense fallback={<link rel="icon" href="/favicon.png" />}>
             <Favicon />
          </Suspense>
          <FirebaseClientProvider>
            <LoaderProvider>
              <Header />
              <AnimatePresence mode="wait">
                <motion.main
                  key={pathname}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex-grow"
                >
                  {children}
                </motion.main>
              </AnimatePresence>
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
