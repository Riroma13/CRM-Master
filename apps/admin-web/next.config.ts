import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@crm-master/database', '@crm-master/shared'],
};

export default nextConfig;
