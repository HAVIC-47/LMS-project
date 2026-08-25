import Link from 'next/link';
import { ArrowRightIcon, CircleNotchIcon } from '@phosphor-icons/react/dist/ssr';
import { cn } from '@/lib/cn';

/**
 * The one button in the product.
 *
 * Contrast is baked into each variant rather than left to call sites: `solid` always pairs
 * the accent fill with `--accent-ink-on`, so an unreadable combination cannot be assembled
 * by choosing the wrong pair of utilities.
 *
 * Interactive controls are pills. That rule comes from globals.css and does not vary by
 * placement.
 */

type Variant = 'solid' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base =
  'group relative inline-flex items-center justify-center gap-2 rounded-pill font-medium ' +
  'whitespace-nowrap cursor-pointer select-none ' +
  'transition-[background-color,border-color,color,transform] duration-200 ' +
  '[transition-timing-function:var(--ease-settle)] ' +
  'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50';

const variants: Record<Variant, string> = {
  solid: 'bg-accent text-accent-ink-on hover:bg-accent-hover',
  // Hover moves the border and the text, not the background: a background change on a
  // dark UI reads as a click, which this is not yet.
  outline: 'border border-line-strong bg-transparent text-text hover:border-accent hover:text-accent-text',
  ghost: 'text-text-muted hover:bg-shell hover:text-text',
  danger: 'bg-danger text-white hover:opacity-90',
};

const sizes: Record<Size, string> = {
  // 44px minimum touch target at every size, including sm.
  sm: 'h-11 px-4 text-sm',
  md: 'h-12 px-5 text-sm',
  lg: 'h-13 px-7 text-base',
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  /** Adds a trailing arrow that advances on hover. */
  withArrow?: boolean;
  className?: string;
  children: React.ReactNode;
};

/** The arrow travels on hover, so the control feels like it points somewhere. */
function TrailingArrow() {
  return (
    <ArrowRightIcon
      size={15}
      weight="bold"
      aria-hidden
      className="transition-transform duration-200 [transition-timing-function:var(--ease-settle)] group-hover:translate-x-0.5"
    />
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
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      // A button mid-request must not accept a second click.
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
