import type { NextConfig } from 'next';

const STRAPI_ORIGIN = process.env.STRAPI_URL ?? 'http://127.0.0.1:1337';

/** Parsed once: both the remote pattern and the local-IP decision are derived from it. */
function strapiUrl(): URL | null {
  try {
    return new URL(STRAPI_ORIGIN);
  } catch {
    return null;
  }
}

/** Turns STRAPI_URL into a remotePattern entry, tolerating a missing or malformed value. */
function strapiImageHost(): NonNullable<NonNullable<NextConfig['images']>['remotePatterns']> {
  const url = strapiUrl();
  if (!url) return [];

  return [
    {
      protocol: url.protocol.replace(':', '') as 'http' | 'https',
      hostname: url.hostname,
      port: url.port || undefined,
      pathname: '/uploads/**',
    },
  ];
}

/**
 * Next 16 refuses to fetch a remote image whose hostname resolves to a loopback or private
 * address, and it does so *after* the remotePatterns check — so an allowlisted
 * `http://127.0.0.1:1337/uploads/...` still comes back as `400 "url" parameter is not
 * allowed`. That guard exists to stop the image endpoint being used to probe the private
 * network of the machine it runs on (SSRF), and it is worth keeping in production.
 *
 * Locally, Strapi *is* on loopback, so the guard blocks every uploaded cover. Rather than
 * turning it off outright, it is turned off only when the configured backend is itself a
 * local address: on Railway the hostname is public, this returns false, and the SSRF
 * protection is fully intact.
 */
function strapiIsLocal(): boolean {
  const host = strapiUrl()?.hostname;
  if (!host) return false;

  return (
    host === 'localhost' ||
    host === '::1' ||
    host === '[::1]' ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}

const nextConfig: NextConfig = {
  images: {
    // Only ever true when STRAPI_URL itself points at a local address — see strapiIsLocal.
    dangerouslyAllowLocalIP: strapiIsLocal(),

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
      /**
       * Uploaded covers are served by Strapi, so its origin has to be allowed too.
       * Derived from STRAPI_URL rather than hard-coded, otherwise every uploaded image
       * would 400 in production where the backend is on Railway rather than localhost.
       */
      ...strapiImageHost(),
    ],
  },
};

export default nextConfig;
