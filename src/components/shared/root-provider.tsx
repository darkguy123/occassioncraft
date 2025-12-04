
'use client';

import { Header } from '@/components/shared/header';
import { Footer } from '@/components/shared/footer';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { useFirebase } from '@/firebase';
import { NavigationEvents } from '@/components/shared/navigation-events';
import { Suspense, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { LoaderProvider } from '@/context/loader-context';
import { PageLoader } from './page-loader';
import { CartProvider } from '@/context/cart-context';
import { InstallPwaPrompt } from '@/components/shared/install-pwa-prompt';
import { MobileMenu } from '@/components/shared/mobile-menu';

function Favicon() {
    const { siteSettings, isSiteSettingsLoading } = useFirebase();

    const faviconUrl = siteSettings?.faviconUrl || '/favicon.ico';
    
    if (isSiteSettingsLoading) {
      return <link rel="icon" href="/favicon.ico" />;
    }

    return <link rel="icon" href={faviconUrl} />;
}

function ThemeUpdater() {
    const { siteSettings } = useFirebase();

    useEffect(() => {
        const root = document.documentElement;
        if (!siteSettings) return;

        const hexToHslString = (hex: string): string => {
          let r = 0, g = 0, b = 0;
          if (hex.length === 4) {
              r = parseInt(hex[1] + hex[1], 16);
              g = parseInt(hex[2] + hex[2], 16);
              b = parseInt(hex[3] + hex[3], 16);
          } else if (hex.length === 7) {
              r = parseInt(hex[1] + hex[2], 16);
              g = parseInt(hex[3] + hex[4], 16);
              b = parseInt(hex[5] + hex[6], 16);
          }
          r /= 255; g /= 255; b /= 255;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          let h = 0, s = 0, l = (max + min) / 2;
          if (max !== min) {
              const d = max - min;
              s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
              switch (max) {
                  case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                  case g: h = (b - r) / d + 2; break;
                  case b: h = (r - g) / d + 4; break;
              }
              h /= 6;
          }
          h = Math.round(h * 360);
          s = Math.round(s * 100);
          l = Math.round(l * 100);
          return `${h} ${s}% ${l}%`;
      };

        if (siteSettings.primaryColor) root.style.setProperty('--primary', hexToHslString(siteSettings.primaryColor));
        if (siteSettings.backgroundColor) root.style.setProperty('--background', hexToHslString(siteSettings.backgroundColor));
        if (siteSettings.accentColor) root.style.setProperty('--accent', hexToHslString(siteSettings.accentColor));

    }, [siteSettings]);

    return null;
}

function InnerRootProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    const hideFooter = pathname.startsWith('/validate');
    const showMobileMenu = hasMounted && window.matchMedia('(max-width: 768px)').matches;


    return (
        <>
            <ThemeUpdater />
            <Suspense fallback={<link rel="icon" href="/favicon.ico" />}>
                <Favicon />
            </Suspense>
            <PageLoader />
            <InstallPwaPrompt />
            <Header />
            <main className="flex-grow pb-24 md:pb-0">
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
            {!hideFooter && <Footer />}
            {showMobileMenu && <MobileMenu />}
            <Toaster />
            <Suspense fallback={null}>
                <NavigationEvents />
            </Suspense>
        </>
    );
}

export function RootProvider({ children }: { children: React.ReactNode }) {
  return (
      <FirebaseClientProvider>
        <LoaderProvider>
         <CartProvider>
          <InnerRootProvider>{children}</InnerRootProvider>
         </CartProvider>
        </LoaderProvider>
      </FirebaseClientProvider>
  );
}
