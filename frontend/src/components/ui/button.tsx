import Link from 'next/link';
import { ArrowUpRightIcon, CircleNotchIcon } from '@phosphor-icons/react/dist/ssr';
import { cn } from '@/lib/cn';

/**
 * The one button in the product.
 *
 * Contrast is baked into the variants rather than left to call sites: `solid` pairs the
 * accent fill with `--accent-contrast`, which is tuned per theme, so there is no way to
 * assemble white-on-white by picking the wrong pair.
 *
 * Interactive controls are pills. That is the shape rule from globals.css and it does not
 * vary by placement.
 */

type Variant = 'solid' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base =
  'group relative inline-flex items-center justify-center gap-2 rounded-pill font-medium ' +
  'whitespace-nowrap cursor-pointer select-none ' +
  'transition-[background-color,border-color,color,transform,box-shadow] duration-300 ' +
  '[transition-timing-function:var(--ease-settle)] ' +
  'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55';

const variants: Record<Variant, string> = {
  solid: 'bg-accent text-accent-contrast hover:bg-accent-hover shadow-[0_1px_2px_rgb(24_24_27/0.16)]',
  outline: 'border border-line-strong bg-surface-raised text-text hover:border-accent hover:text-accent',
  ghost: 'text-text-muted hover:bg-shell hover:text-text',
  danger: 'bg-danger text-white hover:opacity-90',
};

const sizes: Record<Size, string> = {
  // 44px minimum touch target on every size, including sm.
  sm: 'h-11 px-4 text-sm',
  md: 'h-12 px-5 text-sm',
  lg: 'h-14 px-7 text-base',
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  /** Renders the trailing arrow inside its own circle, per the nested-CTA pattern. */
  withArrow?: boolean;
  className?: string;
  children: React.ReactNode;
};

/**
 * The arrow never sits naked beside the label. It lives in its own circular well and
 * drifts diagonally on hover, which gives the button a sense of internal mechanism rather
 * than a flat colour change.
 */
function TrailingArrow() {
  return (
    <span
      aria-hidden
      className={cn(
        'ml-1 flex size-7 items-center justify-center rounded-pill',
        'bg-[color-mix(in_oklab,currentColor_16%,transparent)]',
        'transition-transform duration-300 [transition-timing-function:var(--ease-settle)]',
        'group-hover:translate-x-0.5 group-hover:-translate-y-px'
      )}
    >
      <ArrowUpRightIcon size={14} weight="bold" />
    </span>
  );
}

export function Button({
  variant = 'solid',
  size = 'md',
  withArrow = false,
  className,
  children,
  loading = false,
  ...props
}: CommonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      // A button that is mid-request must not accept a second click.
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <>
          <CircleNotchIcon size={16} weight="bold" className="animate-spin" aria-hidden />
          <span>Working</span>
        </>
      ) : (
        <>
          {children}
          {withArrow ? <TrailingArrow /> : null}
        </>
      )}
    </button>
  );
}

export function ButtonLink({
  variant = 'solid',
  size = 'md',
  withArrow = false,
  className,
  children,
  href,
  ...props
}: CommonProps & { href: string } & Omit<React.ComponentProps<typeof Link>, 'href' | 'className'>) {
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
      {withArrow ? <TrailingArrow /> : null}
    </Link>
  );
}
