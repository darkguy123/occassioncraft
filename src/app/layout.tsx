
import type { Metadata } from 'next';
import './globals.css';
import './loader.css';
import { Suspense } from 'react';
import { RootProvider } from '@/components/shared/root-provider';

export const metadata: Metadata = {
  title: 'OccasionCraft',
  description: 'Create, discover, and celebrate events with OccasionCraft.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Suspense fallback={<link rel="icon" href="/favicon.ico" />}>
        </Suspense>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
