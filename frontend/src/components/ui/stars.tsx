import { StarIcon } from '@phosphor-icons/react/dist/ssr';
import { cn } from '@/lib/cn';

/**
 * A read-only star rating.
 *
 * Halves are drawn by clipping a filled star rather than using a half-star glyph, so the
 * shape stays identical to the full one at any size — two different glyphs side by side
 * never quite line up.
 *
 * The number is always rendered as text beside it. A rating communicated only by five
 * shapes is invisible to a screen reader and hard to read at a glance anyway.
 */
export function Stars({
  value,
  count,
  size = 14,
  className,
}: {
  /** 0–5, may be fractional. */
  value: number;
  /** How many ratings the average is over. Omitted hides the count. */
  count?: number;
  size?: number;
  className?: string;
}) {
  const rating = Math.max(0, Math.min(5, value));

  return (
    <span className={cn('flex items-center gap-1.5', className)}>
      <span className="flex items-center gap-0.5" aria-hidden>
        {[0, 1, 2, 3, 4].map((index) => {
          const fill = Math.max(0, Math.min(1, rating - index));

          return (
            <span key={index} className="relative inline-flex" style={{ width: size, height: size }}>
              <StarIcon size={size} className="absolute inset-0 text-line-strong" />
              {fill > 0 ? (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fill * 100}%` }}
                >
                  <StarIcon size={size} weight="fill" className="text-accent" />
                </span>
              ) : null}
            </span>
          );
        })}
      </span>

      <span className="font-mono text-xs tabular-nums text-text-muted">
        {rating.toFixed(1)}
        {typeof count === 'number' ? (
          <span className="text-text-subtle"> ({count})</span>
        ) : null}
      </span>

      <span className="sr-only">
        {rating.toFixed(1)} out of 5
        {typeof count === 'number' ? `, from ${count} rating${count === 1 ? '' : 's'}` : ''}
      </span>
    </span>
  );
}
