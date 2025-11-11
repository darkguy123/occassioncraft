
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
  const defaultFavicon = "https://firebasestorage.googleapis.com/v0/b/studio-8569439258-4b916.firebasestorage.app/o/public%2Fassets%2Fbrightened-image-remove-photos%20(4).png?alt=media&token=665db9b9-ef34-4be3-a3fe-f5716e7db870";
  if (typeof window !== 'undefined') {
    const faviconUrl = localStorage.getItem('websiteFavicon');
    if (faviconUrl) {
      return <link rel="icon" href={faviconUrl} />;
    }
  }
  return <link rel="icon" href={defaultFavicon} />;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <Suspense fallback={<link rel="icon" href="/favicon.ico" />}>
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
