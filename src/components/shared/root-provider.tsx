
'use client';

import { Header } from '@/components/shared/header';
import { Footer } from '@/components/shared/footer';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { NavigationEvents } from '@/components/shared/navigation-events';
import { Suspense, useState, useEffect } from 'react';
import { ThemeProvider } from '@/context/theme-provider';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

function Favicon() {
    const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
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

    if (!hasMounted || !faviconUrl) {
      // Render fallback on the server and during initial client render
      return <link rel="icon" href="/favicon.png" />;
    }

    return <link rel="icon" href={faviconUrl} />;
}

export function RootProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    return (
        <ThemeProvider>
          <Suspense fallback={<link rel="icon" href="/favicon.png" />}>
             <Favicon />
          </Suspense>
          <FirebaseClientProvider>
              <Header />
              <main className="flex-grow">
                {hasMounted ? (
                    <AnimatePresence mode="wait">
                        <motion.div
                          key={pathname}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3 }}
                        >
                          {children}
                        </motion.div>
                    </AnimatePresence>
                ) : (
                    // Render children directly on the server and initial client render
                    children
                )}
              </main>
              <Footer />
              <Toaster />
              <Suspense fallback={null}>
                <NavigationEvents />
              </Suspense>
          </FirebaseClientProvider>
        </ThemeProvider>
    );
}
