import type { Metadata } from 'next';
import Link from 'next/link';
import { BellIcon } from '@phosphor-icons/react/dist/ssr';
import { Container, EmptyState, SectionHeading } from '@/components/ui/primitives';
import { getMyNotifications } from '@/lib/api/notifications';
import { requireUser } from '@/lib/guards';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Notifications' };

/**
 * The full inbox.
 *
 * The bell shows the recent few; this shows everything the backend keeps. Rendered on the
 * server so it is readable without JavaScript, unlike the dropdown.
 */
export default async function NotificationsPage() {
  await requireUser();

  const { items, unread } = await getMyNotifications();

  return (
    <div className="py-16 lg:py-20">
      <Container className="flex max-w-3xl flex-col gap-10">
        <SectionHeading
          as="h1"
          title="Notifications"
          lede={
            unread > 0
              ? `${unread} unread. Opening one marks it read.`
              : 'Everything here has been read.'
          }
        />

        {items.length === 0 ? (
          <EmptyState
            icon={<BellIcon size={32} aria-hidden />}
            title="Nothing yet"
            description="Enrollments, replies to your comments, quiz results and new posts all land here."
          />
        ) : (
          <ol className="flex flex-col">
            {items.map((item) => {
              const row = (
                <div
                  className={cn(
                    'flex flex-col gap-1.5 border-b border-line py-5 first:border-t',
                    item.href && 'transition-colors duration-200 group-hover:bg-surface'
                  )}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <span
                      className={cn(
                        'text-base',
                        item.read ? 'text-text-muted' : 'font-medium text-text'
                      )}
                    >
                      {item.title}
                    </span>
                    <span className="microlabel shrink-0">{formatDate(item.createdAt)}</span>
                  </div>

                  {item.body ? (
                    <p className="text-sm text-text-subtle">{item.body}</p>
                  ) : null}

                  {/* Unread is carried by weight and a word, never by colour alone. */}
                  {!item.read ? <span className="microlabel text-accent-text">Unread</span> : null}
                </div>
              );

              return (
                <li key={item.documentId}>
                  {item.href ? (
                    <Link href={item.href} className="group block cursor-pointer">
                      {row}
                    </Link>
                  ) : (
                    row
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </Container>
    </div>
  );
}
