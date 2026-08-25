'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BellIcon,
  ChatCircleIcon,
  CheckCircleIcon,
  GraduationCapIcon,
  HeartIcon,
  ListChecksIcon,
  NotePencilIcon,
  UserGearIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import type { AppNotification, NotificationType } from '@/lib/api/notifications';

/**
 * Notification bell.
 *
 * Polls rather than holding a socket open. A WebSocket would be the right answer for a
 * chat product; here the events are a comment or an enrollment landing every few minutes
 * at most, and a 60-second poll of a count-only endpoint costs far less than the
 * connection management a socket needs to survive sleep, reconnects and multiple tabs.
 *
 * Two levels of fetch on purpose: the interval asks only for the unread count, and the
 * full list is fetched when the panel is actually opened.
 */

const ICONS: Record<NotificationType, React.ComponentType<{ size?: number; weight?: 'fill' | 'regular'; className?: string }>> = {
  'comment-on-post': ChatCircleIcon,
  'reply-to-comment': ChatCircleIcon,
  'post-liked': HeartIcon,
  'course-enrolled': GraduationCapIcon,
  'quiz-submitted': ListChecksIcon,
  'quiz-result': ListChecksIcon,
  'course-published': CheckCircleIcon,
  'lesson-added': NotePencilIcon,
  'post-published': NotePencilIcon,
  'role-changed': UserGearIcon,
};

const POLL_MS = 60_000;

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' });
      const payload = await response.json();

      setItems(payload.data ?? []);
      setUnread(payload.meta?.unread ?? 0);
    } catch {
      // Offline or the backend is down. The bell keeps its last known count rather than
      // resetting to zero, which would read as "everything is handled".
    } finally {
      setLoading(false);
    }
  }, []);

  // Count-only poll. Skipped while the panel is open, because the open panel already
  // holds fresher data and re-fetching under the cursor makes rows move.
  useEffect(() => {
    if (open) return;

    const tick = async () => {
      try {
        const response = await fetch('/api/notifications', { cache: 'no-store' });
        const payload = await response.json();
        setUnread(payload.meta?.unread ?? 0);
      } catch {
        // Ignored: a failed poll should not disturb what is on screen.
      }
    };

    const id = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(id);
  }, [open]);

  // Close on an outside click or Escape, the two things every menu is expected to do.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void load();
  };

  const markAll = async () => {
    // Optimistic here, unlike progress or enrollment: this only changes what is bold, and
    // being briefly wrong about that costs nothing.
    setUnread(0);
    setItems((current) => current?.map((item) => ({ ...item, read: true })) ?? current);

    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).catch(() => undefined);

    router.refresh();
  };

  const openItem = async (item: AppNotification) => {
    setOpen(false);

    if (!item.read) {
      setUnread((current) => Math.max(0, current - 1));
      setItems((current) =>
        current?.map((entry) =>
          entry.documentId === item.documentId ? { ...entry, read: true } : entry
        ) ?? current
      );

      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: item.documentId }),
      }).catch(() => undefined);
    }

    if (item.href) router.push(item.href);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative flex size-11 cursor-pointer items-center justify-center rounded-control text-text-muted transition-colors duration-200 hover:bg-shell hover:text-text"
      >
        <BellIcon size={18} weight={unread > 0 ? 'fill' : 'regular'} aria-hidden />

        {unread > 0 ? (
          <span
            aria-hidden
            className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-control bg-accent px-1 font-mono text-[10px] leading-4 text-accent-ink-on"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-card border border-line bg-surface-raised shadow-[var(--shadow-lifted)]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <span className="microlabel">Notifications</span>
            {unread > 0 ? (
              <button
                type="button"
                onClick={markAll}
                className="cursor-pointer text-xs font-medium text-accent-text hover:underline"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {items === null && loading ? (
              <p className="px-4 py-8 text-center text-sm text-text-muted">Loading</p>
            ) : !items || items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-text-muted">
                Nothing yet. Enrollments, replies and quiz results land here.
              </p>
            ) : (
              <ul className="flex flex-col">
                {items.map((item) => {
                  const Icon = ICONS[item.type] ?? BellIcon;

                  return (
                    <li key={item.documentId}>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => openItem(item)}
                        className={cn(
                          'flex w-full cursor-pointer items-start gap-3 border-b border-line px-4 py-3 text-left transition-colors duration-200 last:border-b-0',
                          item.read ? 'hover:bg-shell' : 'bg-accent-soft/60 hover:bg-accent-soft'
                        )}
                      >
                        <Icon
                          size={16}
                          className={cn('mt-0.5 shrink-0', item.read ? 'text-text-subtle' : 'text-accent-text')}
                        />

                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              'block text-sm leading-snug',
                              item.read ? 'text-text-muted' : 'font-medium text-text'
                            )}
                          >
                            {item.title}
                          </span>
                          {item.body ? (
                            <span className="mt-0.5 block truncate text-xs text-text-subtle">
                              {item.body}
                            </span>
                          ) : null}
                          <span className="mt-1 block text-[11px] text-text-subtle">
                            {timeAgo(item.createdAt)}
                          </span>
                        </span>

                        {/* Unread is signalled by weight and a dot, not by colour alone. */}
                        {!item.read ? (
                          <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-control bg-accent" />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-line px-4 py-2.5">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-accent-text hover:underline"
            >
              See all
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
