import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    /**
     * Course covers and post images are stored as URLs on the Strapi records rather than
     * uploaded files, so every host that can appear in `coverImageUrl` has to be listed
     * here. Next refuses to optimise an image from an unlisted host, which is the point:
     * without the allowlist the image endpoint would proxy arbitrary URLs.
     */
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'fastly.picsum.photos' },
    ],
  },
};

export default nextConfig;
