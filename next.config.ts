import type { NextConfig } from 'next';

// Simple Next.js configuration for NFT Launchpad
const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    optimizeCss: false,
    serverActions: {
      bodySizeLimit: '15mb',
    },
  },
  // Global API route configuration
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
    responseLimit: '15mb',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      }
    ],
    // Disable image optimization for IPFS (too slow)
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true, // Ignore TypeScript errors during build
  },
  // Turbopack configuration
  turbopack: {
    resolveAlias: {
      '@react-native-async-storage/async-storage': './node_modules/next/dist/build/polyfills/process.js',
      'pino-pretty': './node_modules/next/dist/build/polyfills/process.js',
    },
  },
  // Webpack fallback for production builds
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    };

    config.module = {
      ...config.module,
      exprContextCritical: false,
    };

    return config;
  },
};

export default nextConfig;
