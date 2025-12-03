
'use client';

import { Header } from '@/components/shared/header';
import { Footer } from '@/components/shared/footer';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { NavigationEvents } from '@/components/shared/navigation-events';
import { Suspense, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { LoaderProvider } from '@/context/loader-context';
import { PageLoader } from './page-loader';
import { CartProvider } from '@/context/cart-context';

function Favicon() {
    const [faviconUrl, setFaviconUrl] = useState('https://firebasestorage.googleapis.com/v0/b/studio-8569439258-4b916.firebasestorage.app/o/public%2Fassets%2Fremove-photos-background-removed%20(1).png?alt=media&token=e95cb4d3-18c7-48b8-93f8-656354e39a3f');
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        if (hasMounted) {
            const loadFavicon = () => {
                const savedFavicon = localStorage.getItem('faviconImage');
                if (savedFavicon) {
                    setFaviconUrl(savedFavicon);
                }
            };

            loadFavicon();
            window.addEventListener('storage', loadFavicon);

            return () => {
                window.removeEventListener('storage', loadFavicon);
            };
        }
    }, [hasMounted]);

    if (!hasMounted) {
        // Render a default on the server and initial client render
        return <link rel="icon" href="https://firebasestorage.googleapis.com/v0/b/studio-8569439258-4b916.firebasestorage.app/o/public%2Fassets%2Fremove-photos-background-removed%20(1).png?alt=media&token=e95cb4d3-18c7-48b8-93f8-656354e39a3f" />;
    }

    return <link rel="icon" href={faviconUrl} />;
}


export function RootProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);

        const applyTheme = () => {
            const root = document.documentElement;
            const primary = localStorage.getItem('theme-primary');
            const background = localStorage.getItem('theme-background');
            const accent = localStorage.getItem('theme-accent');
    
            if (primary) root.style.setProperty('--primary', primary);
            if (background) root.style.setProperty('--background', background);
            if (accent) root.style.setProperty('--accent', accent);
        };
    
        applyTheme();
        window.addEventListener('storage', applyTheme);
    
        return () => {
          window.removeEventListener('storage', applyTheme);
        };
    }, []);

    return (
        <>
          <Suspense fallback={<link rel="icon" href="https://firebasestorage.googleapis.com/v0/b/studio-8569439258-4b916.firebasestorage.app/o/public%2Fassets%2Fremove-photos-background-removed%20(1).png?alt=media&token=e95cb4d3-18c7-48b8-93f8-656354e39a3f" />}>
             <Favicon />
          </Suspense>
          <FirebaseClientProvider>
            <LoaderProvider>
             <CartProvider>
              <PageLoader />
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
                    children
                )}
              </main>
              <Footer />
              <Toaster />
              <Suspense fallback={null}>
                <NavigationEvents />
              </Suspense>
             </CartProvider>
            </LoaderProvider>
          </FirebaseClientProvider>
        </>
    );
}
