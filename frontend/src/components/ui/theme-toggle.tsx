'use client';

import { useSyncExternalStore } from 'react';
import { MoonIcon, SunIcon } from '@phosphor-icons/react';

type Theme = 'light' | 'dark';

/**
 * The `data-theme` attribute on <html> is the source of truth, not React state.
 *
 * The inline script in the root layout sets that attribute before first paint, so by the
 * time React hydrates the correct theme is already applied. Copying it into `useState`
 * inside an effect would mean rendering once with the wrong value and then re-rendering,
 * which is exactly the cascading-render pattern React 19 warns about.
 *
 * `useSyncExternalStore` subscribes to the attribute instead: the server snapshot is
 * "light", the client snapshot reads the DOM, and a MutationObserver re-renders the button
 * if anything changes the attribute, including another tab or a future system-theme change.
 */
const subscribe = (onStoreChange: () => void) => {
  const observer = new MutationObserver(onStoreChange);

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  return () => observer.disconnect();
};

const getSnapshot = (): Theme =>
  document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

// Nothing on the server has a DOM, and the markup is theme-neutral anyway: the colours
// come from CSS variables, so only this button's glyph depends on the value.
const getServerSnapshot = (): Theme => 'light';

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';

    // Writing the attribute is what re-renders this button, via the observer above.
    document.documentElement.setAttribute('data-theme', next);

    try {
      localStorage.setItem('lms-theme', next);
    } catch {
      // Private browsing can refuse writes. The theme still applies for this page view.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      // The label describes what pressing it will do, not the current state.
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className="flex size-11 cursor-pointer items-center justify-center rounded-control text-text-muted transition-colors duration-200 hover:bg-shell hover:text-text"
    >
      {theme === 'light' ? (
        <MoonIcon size={18} weight="regular" aria-hidden />
      ) : (
        <SunIcon size={18} weight="regular" aria-hidden />
      )}
    </button>
  );
}
