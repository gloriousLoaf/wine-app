import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'd2mvsg0ph94s7h.cloudfront.net',
      },
    ],
  },
};

export default nextConfig;
