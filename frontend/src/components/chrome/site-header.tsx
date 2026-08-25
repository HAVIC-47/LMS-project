'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { SignOutIcon } from '@phosphor-icons/react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ButtonLink, Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { ROLE_LABELS, type SessionUser } from '@/lib/types';

const NAV_LINKS = [
  { href: '/courses', label: 'Courses' },
  { href: '/blog', label: 'Writing' },
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
export function SiteHeader({ user }: { user: SessionUser | null }) {
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
   * Links that only make sense for one role. Rendering them for everyone would put a
   * visitor one click from a page that would only bounce them to /forbidden.
   */
  const roleLinks =
    user?.role === 'student'
      ? [{ href: '/my-courses', label: 'My courses' }]
      : user?.role === 'admin'
        ? [
            { href: '/studio', label: 'Studio' },
            { href: '/admin', label: 'Admin' },
          ]
        : user?.role === 'content-manager' || user?.role === 'instructor'
          ? [{ href: '/studio', label: 'Studio' }]
          : [];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-page/80 backdrop-blur-xl">
      <nav
        aria-label="Main"
        className={cn(
          'mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4',
          'px-4 sm:px-6 lg:px-8'
        )}
      >
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-base font-semibold tracking-tight text-text"
        >
          <span aria-hidden className="size-2.5 rounded-pill bg-accent" />
          Kiln
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-pill px-3.5 py-2 text-sm transition-colors duration-200',
                isActive(link.href) ? 'text-text' : 'text-text-muted hover:text-text'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />

          {user ? (
            <div className="hidden items-center gap-2 md:flex">
              {roleLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'rounded-pill px-3.5 py-2 text-sm transition-colors duration-200',
                    isActive(link.href) ? 'text-text' : 'text-text-muted hover:text-text'
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <ButtonLink href="/dashboard" variant="outline" size="sm">
                Dashboard
              </ButtonLink>
              <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                aria-label="Sign out"
                className="flex size-11 cursor-pointer items-center justify-center rounded-pill text-text-muted transition-colors duration-200 hover:bg-shell hover:text-text disabled:opacity-50"
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
                    <p className="text-sm text-text-muted">
                      Signed in as {user.username}
                      {user.role ? ` (${ROLE_LABELS[user.role]})` : ''}
                    </p>
                    <ButtonLink href="/dashboard" variant="solid" size="lg" withArrow onClick={closeMenu}>
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
      className="relative z-50 flex size-11 cursor-pointer items-center justify-center rounded-pill text-text transition-colors duration-200 hover:bg-shell md:hidden"
    >
      <span className="relative block h-4 w-5" aria-hidden>
        <span
          className={cn(
            'absolute left-0 block h-[1.5px] w-5 rounded-pill bg-current',
            'transition-transform duration-300 [transition-timing-function:var(--ease-settle)]',
            open ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-1'
          )}
        />
        <span
          className={cn(
            'absolute left-0 block h-[1.5px] w-5 rounded-pill bg-current',
            'transition-transform duration-300 [transition-timing-function:var(--ease-settle)]',
            open ? 'top-1/2 -translate-y-1/2 -rotate-45' : 'top-[11px]'
          )}
        />
      </span>
    </button>
  );
}
