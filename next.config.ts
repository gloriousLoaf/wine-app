import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { COLLECTION_CACHE_CONTROL } from "./lib/cache-control";

initOpenNextCloudflareForDev();

const remotePatterns: NonNullable<NextConfig['images']>['remotePatterns'] = [];

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
  async headers() {
    return [
      {
        // Let the Cloudflare edge serve the collection view so repeat traffic
        // never reaches the Worker (and therefore never reaches D1). This
        // header only matters once a Cache Rule enables HTML caching for the
        // zone — Cloudflare does not cache HTML by default. The zone
        // configuration this depends on is recorded in the README.
        source: '/',
        headers: [{ key: 'Cache-Control', value: COLLECTION_CACHE_CONTROL }],
      },
      {
        // Never cache admin, and keep it out of any index that ignores robots.txt.
        source: '/admin/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

export default nextConfig;
