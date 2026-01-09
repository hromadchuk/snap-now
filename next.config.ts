import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    experimental: {
        serverActions: {
            bodySizeLimit: '2mb',
        },
    },
    rewrites() {
        return [
            {
                source: '/moments/:path*',
                destination: 'https://K3OrUlY5RtrmZ90d.public.blob.vercel-storage.com/moments/:path*',
            },
        ];
    },
};

export default nextConfig;
