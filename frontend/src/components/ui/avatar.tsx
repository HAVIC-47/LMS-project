'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/cn';
import { isRenderableImage } from '@/lib/format';

/**
 * A profile picture that always renders something.
 *
 * The fallback is initials on a tinted disc rather than a generic silhouette, because a
 * grid of identical silhouettes tells the reader nothing while a grid of initials is
 * scannable. Most accounts will never upload a picture, so the fallback is the common
 * case and deserves to look deliberate.
 *
 * A client component for the same reason `CoverImage` is one: `onError` runs in the
 * browser, and an avatar URL is user-supplied, so a well-formed address that 404s is
 * routine. A broken-image glyph where a face should be reads as a broken product.
 */

const SIZES = {
  sm: { box: 'size-8', text: 'text-[11px]', px: 32 },
  md: { box: 'size-11', text: 'text-sm', px: 44 },
  lg: { box: 'size-16', text: 'text-lg', px: 64 },
  xl: { box: 'size-24 sm:size-28', text: 'text-3xl', px: 112 },
} as const;

export type AvatarSize = keyof typeof SIZES;

/**
 * One or two letters. A display name gives its first and last initial, a username gives
 * its first character — running `split(' ')` over a username produces one useless letter
 * either way, so it is not worth the branch.
 */
function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function Avatar({
  src,
  name,
  size = 'md',
  className,
}: {
  src?: string | null;
  /** Display name if there is one, otherwise the username. Drives the initials. */
  name: string;
  size?: AvatarSize;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const scale = SIZES[size];
  const usable = isRenderableImage(src) && !failed;

  return (
    <span
      className={cn(
        'relative flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full',
        'border border-line bg-shell',
        scale.box,
        className,
      )}
    >
      {usable ? (
        <Image
          src={src as string}
          alt=""
          fill
          // Fixed pixel box, so a single hint is exact at every breakpoint and the
          // optimizer never fetches a 1200px source for a 32px disc.
          sizes={`${scale.px}px`}
          onError={() => setFailed(true)}
          className="object-cover"
        />
      ) : (
        <span aria-hidden className={cn('font-medium tracking-wide text-text-subtle', scale.text)}>
          {initialsFor(name)}
        </span>
      )}
    </span>
  );
}
