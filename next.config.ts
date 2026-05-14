
import type { NextConfig } from 'next';

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // Avoid generated async plugin wrappers that can emit missing helper refs in sw.js.
  dynamicStartUrl: false,
  workboxOptions: {
    // Keep SW output modern to avoid injecting external Babel helpers at runtime.
    babelPresetEnvTargets: [
      'chrome >= 93',
      'edge >= 93',
      'firefox >= 91',
      'safari >= 15.4',
    ],
    navigateFallback: '/offline',
    // Exclude API calls from caching by the service worker
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/(?:firestore|identitytoolkit)\.googleapis\.com\/.*/,
        handler: 'NetworkOnly',
      },
    ],
  },
});

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY:
      process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY || '',
    NEXT_PUBLIC_KORAPAY_PUBLIC_KEY:
      process.env.NEXT_PUBLIC_KORAPAY_PUBLIC_KEY || process.env.KORAPAY_PUBLIC_KEY || '',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.firebasestorage.app',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
    unoptimized: false,
  },
};

export default withPWA(nextConfig);
