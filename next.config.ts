
import type {NextConfig} from 'next';

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  fallbacks: {
    //image: "/static/images/fallback.png",
    //document: "/offline",
    //font: '/static/font/fallback.woff2',
    //audio: ...,
    //video: ...,
  },
});


const nextConfig: NextConfig = {
  /* config options here */
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
        pathname: '**',
      },
       {
        protocol: 'https' ,
        hostname: 'picsum.photos',
        port: '',
        pathname: '**',
      },
    ],
    unoptimized: false,
  },
};

export default withPWA(nextConfig);
