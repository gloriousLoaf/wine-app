import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

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
};

export default nextConfig;
