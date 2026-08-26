import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Playfair_Display } from 'next/font/google';
import { SiteHeader } from '@/components/chrome/site-header';
import { SiteFooter } from '@/components/chrome/site-footer';
import { getSessionUser } from '@/lib/session';
import { getUnreadCount } from '@/lib/api/notifications';
import './globals.css';

/**
 * The display face. Self-hosted by `next/font`, so there is no render-blocking request to
 * Google and no layout shift when it arrives. `display: 'swap'` shows the fallback first
 * rather than leaving headings invisible.
 */
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'CourseCatalyst - learn the parts that stick',
    template: '%s | CourseCatalyst',
  },
  description:
    'Short courses with real lessons, honest progress tracking and quizzes that grade themselves.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f5f0' },
    { media: '(prefers-color-scheme: dark)', color: '#12140f' },
  ],
};

/**
 * Runs before first paint so the page never flashes the wrong theme.
 *
 * The order is deliberate: an explicit choice in localStorage wins, otherwise the OS
 * preference decides. It is inlined rather than imported because a module would load after
 * the first paint, which is exactly the flash this avoids.
 */
const themeBootstrap = `
(function () {
  try {
    var stored = localStorage.getItem('lms-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored === 'light' || stored === 'dark' ? stored : (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  // Fetched here so the badge is correct on first paint rather than appearing a moment
  // after hydration. Skipped entirely when nobody is signed in.
  const unreadNotifications = user ? await getUnreadCount() : 0;

  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable} ${playfair.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        {/* Scroll reveals start hidden and are shown by JavaScript. With scripting off
            that would leave most of the page blank, so force them visible instead. */}
        <noscript>
          <style>{'[data-reveal]{opacity:1 !important;transform:none !important}'}</style>
        </noscript>
      </head>
      <body className="min-h-[100dvh] antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-accent focus:px-5 focus:py-2.5 focus:text-sm focus:font-medium focus:text-accent-ink-on"
        >
          Skip to content
        </a>

        <SiteHeader user={user} unreadNotifications={unreadNotifications} />

        <main id="main" className="min-h-[60dvh]">
          {children}
        </main>

        <SiteFooter />
      </body>
    </html>
  );
}
