import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Proxy /api/* and /uploads/* requests to the Express server
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:4000/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;
