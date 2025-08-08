import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Updated configuration for Next.js 15
  serverExternalPackages: ['promptfoo', 'source-map-support', 'esbuild', '@esbuild/win32-x64'],
  
  // Configure Turbopack for better handling of external packages
  experimental: {
    turbo: {
      resolveExtensions: [
        '.mdx',
        '.tsx',
        '.ts',
        '.jsx',
        '.js',
        '.mjs',
        '.json',
      ],
    },
  },
};

export default nextConfig;
