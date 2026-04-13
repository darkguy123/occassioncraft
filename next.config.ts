
import type { NextConfig } from 'next';

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: '/offline', // A dedicated offline page
  },
  workboxOptions: {
    // This is a common fix for the _async_to_generator error.
    // It ensures the service worker has the necessary runtime.
    babelPresetEnvTargets: ['> 0.25%, not dead'],
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
