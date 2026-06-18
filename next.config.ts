import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig['images']>['remotePatterns'] = [
  // Keep Vercel Blob until all images are migrated to R2
  { protocol: 'https', hostname: '**.public.blob.vercel-storage.com' },
];

if (process.env.R2_PUBLIC_URL) {
  remotePatterns.push({
    protocol: 'https',
    hostname: new URL(process.env.R2_PUBLIC_URL).hostname,
  });
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
    minimumCacheTTL: 31536000,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
};

export default nextConfig;
