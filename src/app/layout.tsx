
import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/shared/header';
import { Footer } from '@/components/shared/footer';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { LoaderProvider } from '@/context/loader-context';
import { PageLoader } from '@/components/shared/page-loader';
import { NavigationEvents } from '@/components/shared/navigation-events';
import { Suspense, use } from 'react';
import { ThemeProvider } from '@/context/theme-provider';

export const metadata: Metadata = {
  title: 'OccasionCraft',
  description: 'Create, discover, and celebrate events with OccasionCraft.',
};

function Favicon() {
  if (typeof window !== 'undefined') {
    const faviconUrl = window.localStorage.getItem('websiteFavicon');
    if (faviconUrl) {
      return <link rel="icon" href={faviconUrl} />;
    }
  }
  return null;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <Suspense fallback={null}>
          <Favicon />
        </Suspense>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col">
        <ThemeProvider>
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
      </body>
    </html>
  );
}
