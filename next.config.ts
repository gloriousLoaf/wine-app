import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { COLLECTION_CACHE_CONTROL } from "./lib/cache-control";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  images: {
    // Bottle images already live on R2's public CDN, so <Image> points straight
    // at them. Without this, every image request went through /_next/image —
    // a Worker invocation that fetched the R2 original and streamed it back
    // unchanged (there is no IMAGES binding to resize with), costing Worker
    // CPU and request quota for nothing. See README "Worker CPU budget".
    unoptimized: true,
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
