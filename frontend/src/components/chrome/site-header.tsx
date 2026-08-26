'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { SignOutIcon } from '@phosphor-icons/react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Avatar } from '@/components/ui/avatar';
import { NotificationBell } from './notification-bell';
import { ButtonLink, Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { ROLE_LABELS, type SessionUser } from '@/lib/types';

/**
 * "Blog" rather than "Writing". The clever label hid the feature: people looking for a
 * blog scanned past it, which is exactly the failure a distinctive name is supposed to
 * avoid and instead caused.
 */
const NAV_LINKS = [
  { href: '/courses', label: 'Courses' },
  { href: '/blog', label: 'Blog' },
];

/**
 * Site header.
 *
 * A floating pill detached from the top edge rather than a bar glued to it, so the page
 * reads as content on a surface instead of content under a toolbar. Height stays at 56px
 * inside a 24px offset, well under the point where navigation starts eating the viewport.
 *
 * The whole header is a Client Component because it owns the mobile menu and the sign-out
 * action. The user object is passed down from the server layout, so no fetch happens here.
 */
export function SiteHeader({
  user,
  unreadNotifications = 0,
}: {
  user: SessionUser | null;
  unreadNotifications?: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  // Navigating with the menu open would leave it covering the new page. Closing happens
  // on the click that navigates rather than in an effect watching `pathname`: setting
  // state synchronously inside an effect causes a second render pass for no reason.
  const closeMenu = () => setMenuOpen(false);

  // A full-screen overlay that lets the page scroll behind it feels broken on touch.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const signOut = async () => {
    setMenuOpen(false);
    setSigningOut(true);

    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      // `refresh` re-runs the server layout so the header re-renders without the user,
      // then `replace` moves off any page that required a session.
      router.replace('/');
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  /**
   * Where "Dashboard" goes.
   *
   * For an admin the admin panel *is* their dashboard, so the button skips the generic
   * page rather than bouncing through a redirect the user can see in the address bar.
   * `/dashboard` still redirects for anyone who types it, so the two cannot disagree.
   */
  const dashboardHref = user?.role === 'admin' ? '/admin' : '/dashboard';

  /**
   * Links that only make sense for one role. Rendering them for everyone would put a
   * visitor one click from a page that would only bounce them to /forbidden.
   */
  const roleLinks =
    user?.role === 'student'
      ? [{ href: '/my-courses', label: 'My courses' }]
      : user?.role === 'admin'
        ? // No separate "Admin" link: the Dashboard button already lands there, and two
          // controls to the same page is one more thing to scan past.
          [{ href: '/studio', label: 'Studio' }]
        : user?.role === 'content-manager' || user?.role === 'instructor'
          ? [{ href: '/studio', label: 'Studio' }]
          : [];

  return (
    <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6 sm:pt-5">
      <nav
        aria-label="Main"
        className={cn(
          // Detached from the top edge and floating on a blurred pane. The bar reads as
          // an object over the page rather than a strip welded to the viewport, which is
          // the difference between "modern header" and "toolbar".
          'mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 rounded-card sm:gap-4',
          // Tighter padding on a phone. "CourseCatalyst" is a long wordmark and the bar
          // also carries the bell, the theme toggle, the avatar and the menu button; at
          // 375px the old 20px inset was enough to push the row into a horizontal scroll.
          'border border-line pl-3.5 pr-2 sm:pl-5 sm:pr-2.5',
          // Glass, properly: a tinted pane rather than a faded box. Saturation is pushed
          // past 100% because a plain blur desaturates whatever is behind it and leaves
          // the pill looking grey; lifting it back is what makes the pane read as glass
          // instead of frosted plastic.
          'bg-[var(--glass-fill)] [background-image:var(--glass-sheen)]',
          // A heavy blur is what buys the low fill. At 40px whatever is behind the bar is
          // reduced to a wash of colour, so the pane can sit near half-transparent and
          // still keep the wordmark legible over a photograph.
          'backdrop-blur-[40px] backdrop-saturate-[1.8]',
          // The lit top rim and shadowed bottom rim are inset shadows rather than pseudo
          // elements, so the notification popover is not clipped by an overflow-hidden.
          'shadow-[var(--shadow-ambient),inset_0_1px_0_var(--glass-edge),inset_0_-1px_0_var(--glass-underline)]',
          // Older Safari and Firefox with backdrop-filter disabled would render the pane
          // at 76%/62% over live content, which is unreadable. Fall back to opaque there.
          'supports-[not_(backdrop-filter:blur(0))]:bg-surface-raised'
        )}
      >
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-base font-semibold tracking-tight text-text"
        >
          <span
            aria-hidden
            className="flex size-7 items-center justify-center rounded-control bg-accent font-mono text-[13px] font-bold leading-none text-accent-ink-on"
          >
            C
          </span>
          <span className="font-serif text-base tracking-tight sm:text-lg">CourseCatalyst</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'relative rounded-control px-3.5 py-2 text-sm transition-colors duration-200',
                // Inactive links used to be `text-text-muted`, which was fine on an opaque
                // bar. Through glass the backdrop is whatever the page happens to be
                // scrolled to — a photograph, a dark band — and muted text over that drops
                // under 3:1. Hierarchy moves to weight and the accent rule instead, both
                // of which survive any background.
                isActive(link.href) ? 'font-medium text-text' : 'text-text/85 hover:text-text'
              )}
            >
              {link.label}
              {/* The accent marks where you are, and nothing else in the bar uses it. */}
              {isActive(link.href) ? (
                <span
                  aria-hidden
                  className="absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-control bg-accent"
                />
              ) : null}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {user ? <NotificationBell initialUnread={unreadNotifications} /> : null}
          <ThemeToggle />

          {user ? (
            <div className="hidden items-center gap-2 md:flex">
              {roleLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'relative rounded-control px-3.5 py-2 text-sm transition-colors duration-200',
                    isActive(link.href) ? 'font-medium text-text' : 'text-text-muted hover:text-text'
                  )}
                >
                  {link.label}
                  {isActive(link.href) ? (
                    <span
                      aria-hidden
                      className="absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-control bg-accent"
                    />
                  ) : null}
                </Link>
              ))}
              <ButtonLink href={dashboardHref} variant="outline" size="sm">
                Dashboard
              </ButtonLink>
              <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                aria-label="Sign out"
                className="flex size-11 cursor-pointer items-center justify-center rounded-control text-text-muted transition-colors duration-200 hover:bg-shell hover:text-text disabled:opacity-50"
              >
                <SignOutIcon size={18} aria-hidden />
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <ButtonLink href="/login" variant="ghost" size="sm">
                Log in
              </ButtonLink>
              <ButtonLink href="/signup" variant="solid" size="sm">
                Get started
              </ButtonLink>
            </div>
          )}

          {/*
            The avatar sits outside the `md:flex` cluster on purpose, so it is present on a
            phone as well — the whole point of a profile picture in a header is that it is
            the one persistent marker of who you are signed in as, and hiding it at the
            breakpoint where the rest of the nav collapses would remove it exactly where
            the other cues are already gone.

            A plain link rather than a dropdown: one click reaches the profile, which is
            where "edit profile" lives anyway.
          */}
          {user ? (
            <Link
              href={`/u/${user.username}`}
              aria-label={`Your profile, ${user.displayName || user.username}`}
              className={cn(
                'ml-1 cursor-pointer rounded-full transition-[box-shadow,transform] duration-200',
                '[transition-timing-function:var(--ease-settle)] hover:scale-[1.04]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-raised)]',
                isActive(`/u/${user.username}`)
                  ? 'ring-2 ring-accent ring-offset-2 ring-offset-[var(--surface-raised)]'
                  : 'hover:ring-2 hover:ring-line-strong hover:ring-offset-2 hover:ring-offset-[var(--surface-raised)]'
              )}
            >
              <Avatar
                src={user.avatarUrl}
                name={user.displayName || user.username}
                size="sm"
              />
            </Link>
          ) : null}

          <MenuButton open={menuOpen} onToggle={() => setMenuOpen((open) => !open)} />
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            id="mobile-menu"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-page/95 backdrop-blur-2xl md:hidden"
          >
            <div className="flex h-full flex-col justify-center gap-2 px-8">
              {NAV_LINKS.map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.06 + index * 0.06, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    href={link.href}
                    onClick={closeMenu}
                    className="block py-3 text-4xl font-semibold tracking-tight"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}

              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="mt-8 flex flex-col gap-3 border-t border-line pt-8"
              >
                {user ? (
                  <>
                    {/* The same identity marker as the bar above, at a size that works as
                        a tap target rather than as a glyph. */}
                    <Link
                      href={`/u/${user.username}`}
                      onClick={closeMenu}
                      className="flex items-center gap-3 rounded-card py-1 transition-colors hover:text-text"
                    >
                      <Avatar
                        src={user.avatarUrl}
                        name={user.displayName || user.username}
                        size="md"
                      />
                      <span className="flex flex-col">
                        <span className="text-base font-medium text-text">
                          {user.displayName || user.username}
                        </span>
                        <span className="text-sm text-text-muted">
                          {user.role ? ROLE_LABELS[user.role] : 'View profile'}
                        </span>
                      </span>
                    </Link>
                    <ButtonLink
                      href={dashboardHref}
                      variant="solid"
                      size="lg"
                      withArrow
                      onClick={closeMenu}
                    >
                      Dashboard
                    </ButtonLink>
                    <Button variant="outline" size="lg" onClick={signOut} loading={signingOut}>
                      Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <ButtonLink href="/signup" variant="solid" size="lg" withArrow onClick={closeMenu}>
                      Get started
                    </ButtonLink>
                    <ButtonLink href="/login" variant="outline" size="lg" onClick={closeMenu}>
                      Log in
                    </ButtonLink>
                  </>
                )}
              </motion.div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

/**
 * Hamburger that morphs into a cross.
 *
 * Both bars are absolutely positioned at the same point and separated by transforms, so
 * closing is the same animation running backwards rather than one icon swapping for
 * another. Drawn from two spans rather than an icon font because the shape has to be
 * animated, not replaced.
 */
function MenuButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="mobile-menu"
      aria-label={open ? 'Close menu' : 'Open menu'}
      className="relative z-50 flex size-11 cursor-pointer items-center justify-center rounded-control text-text transition-colors duration-200 hover:bg-shell md:hidden"
    >
      <span className="relative block h-4 w-5" aria-hidden>
        <span
          className={cn(
            'absolute left-0 block h-[1.5px] w-5 rounded-control bg-current',
            'transition-transform duration-300 [transition-timing-function:var(--ease-settle)]',
            open ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-1'
          )}
        />
        <span
          className={cn(
            'absolute left-0 block h-[1.5px] w-5 rounded-control bg-current',
            'transition-transform duration-300 [transition-timing-function:var(--ease-settle)]',
            open ? 'top-1/2 -translate-y-1/2 -rotate-45' : 'top-[11px]'
          )}
        />
      </span>
    </button>
  );
}
