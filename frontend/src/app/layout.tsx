import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { SiteHeader } from '@/components/chrome/site-header';
import { SiteFooter } from '@/components/chrome/site-footer';
import { getSessionUser } from '@/lib/session';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Kiln - learn the parts that stick',
    template: '%s | Kiln',
  },
  description:
    'Short courses with real lessons, honest progress tracking and quizzes that grade themselves.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f4f5' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
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

  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
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
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-pill focus:bg-accent focus:px-5 focus:py-2.5 focus:text-sm focus:font-medium focus:text-accent-ink-on"
        >
          Skip to content
        </a>

        <SiteHeader user={user} />

        <main id="main" className="min-h-[60dvh]">
          {children}
        </main>

        <SiteFooter />
      </body>
    </html>
  );
}
