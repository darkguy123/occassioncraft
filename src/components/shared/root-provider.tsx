
'use client';

import { Header } from '@/components/shared/header';
import { Footer } from '@/components/shared/footer';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { NavigationEvents } from '@/components/shared/navigation-events';
import { Suspense, useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { LoaderProvider } from '@/context/loader-context';
import { PageLoader } from './page-loader';
import { CartProvider } from '@/context/cart-context';
import { MobileMenu } from '@/components/shared/mobile-menu';
import { SplashScreen } from './splash-screen';
import { PwaInstallProvider } from '@/context/pwa-install-context';
import { InstallPwaPrompt } from './install-pwa-prompt';
import { doc } from 'firebase/firestore';
import type { User as UserType, Vendor as VendorType } from '@/lib/types';

function Favicon() {
    const { siteSettings, isSiteSettingsLoading } = useFirebase();

    const faviconUrl = siteSettings?.faviconUrl || '/download.png';
    
    if (isSiteSettingsLoading) {
      return <link rel="icon" href="/download.png" />;
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
    const router = useRouter();
    const [hasMounted, setHasMounted] = useState(false);
    const [showSplash, setShowSplash] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    const { user, isUserLoading, firestore } = useFirebase();

    // Fetch user document to check for roles.
    const userDocRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
    const { data: userData, isLoading: isUserDataLoading } = useDoc<UserType>(userDocRef);

    // Only fetch vendor doc if the user is a vendor.
    const isVendor = useMemo(() => userData?.roles?.includes('vendor'), [userData]);
    const vendorDocRef = useMemoFirebase(() => (isVendor && user ? doc(firestore, 'vendors', user.uid) : null), [firestore, user, isVendor]);
    const { isLoading: isVendorDataLoading } = useDoc<VendorType>(vendorDocRef);

    // Overall app loading state: wait for auth, then user doc, then vendor doc if applicable.
    const isAppLoading = isUserLoading || (user && isUserDataLoading) || (isVendor && isVendorDataLoading);


    useEffect(() => {
        setHasMounted(true);
        const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
        const isMobile = window.matchMedia('(max-width: 768px)').matches;

        if (isMobile && !hasSeenWelcome && pathname !== '/welcome') {
            router.replace('/welcome');
            setShowSplash(false); // Don't show splash if redirecting to welcome screen
        }
    }, [router, pathname]);
    
    useEffect(() => {
        // This effect controls the splash screen based on the data loading state.
        if (isInitialLoad && !isAppLoading) {
            // Once all initial data is loaded, hide splash.
            // A small delay can prevent a jarring flash of content.
            const timer = setTimeout(() => {
                setShowSplash(false);
                setIsInitialLoad(false); // Prevent this from running again.
            }, 200); // A short delay for smoother transition
            return () => clearTimeout(timer);
        }
    }, [isInitialLoad, isAppLoading]);

    const hideFooter = pathname.startsWith('/validate') || pathname.startsWith('/welcome');
    const hideHeader = pathname.startsWith('/welcome') || pathname.startsWith('/validate');
    const showMobileMenu = hasMounted && window.matchMedia('(max-width: 768px)').matches && !hideFooter;


    if (showSplash && hasMounted && !pathname.startsWith('/welcome')) {
        return <SplashScreen />;
    }

    if (pathname.startsWith('/welcome')) {
        return children;
    }

    return (
        <>
            <ThemeUpdater />
            <Suspense fallback={<link rel="icon" href="/download.png" />}>
                <Favicon />
            </Suspense>
            <PageLoader />
            {!hideHeader && <Header />}
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
            <InstallPwaPrompt />
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
         <PwaInstallProvider>
             <CartProvider>
              <InnerRootProvider>{children}</InnerRootProvider>
             </CartProvider>
         </PwaInstallProvider>
        </LoaderProvider>
      </FirebaseClientProvider>
  );
}
