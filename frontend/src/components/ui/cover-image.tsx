'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/cn';
import { isRenderableImage } from '@/lib/format';

/**
 * A cover image that degrades instead of breaking.
 *
 * `isRenderableImage` only proves a string is a parseable URL. It cannot know whether the
 * host answers, and cover URLs are typed in by editors: a well-formed address that 404s is
 * common, and the browser's broken-image glyph in the middle of a card looks like the
 * product is broken rather than the link.
 *
 * A client component because `onError` needs to run in the browser. It renders the same
 * `next/image` in the happy path, so optimisation is unchanged.
 */
export function CoverImage({
  src,
  sizes,
  priority = false,
  fallback,
  className,
}: {
  src: string | null | undefined;
  sizes: string;
  priority?: boolean;
  /** Shown when there is no image, or the image fails to load. */
  fallback: React.ReactNode;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!isRenderableImage(src) || failed) {
    return (
      <div className="flex size-full items-center justify-center bg-shell">{fallback}</div>
    );
  }

  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
    />
  );
}
