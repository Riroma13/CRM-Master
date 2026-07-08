import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@crm-master/database', '@crm-master/shared'],
  output: 'standalone',
};

export default nextConfig;
