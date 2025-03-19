import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove static export since we need API routes
  // output: 'export',
  distDir: '.next',
  // Using server-side rendering to support API routes
  images: {
    domains: ['*'], // Allow images from all domains
  },
};

export default nextConfig;
