import 'server-only';

import { strapiFetchOrNull } from '@/lib/strapi';

/**
 * Notification reads.
 *
 * Every one of these is scoped to the caller by the backend. There is no recipient
 * parameter anywhere in the API, so there is no id for this layer to get wrong.
 */

export type NotificationType =
  | 'comment-on-post'
  | 'reply-to-comment'
  | 'post-liked'
  | 'course-enrolled'
  | 'quiz-submitted'
  | 'quiz-result'
  | 'course-published'
  | 'lesson-added'
  | 'post-published'
  | 'role-changed';

export type AppNotification = {
  documentId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
  actor: { id: number; username: string } | null;
};

export async function getMyNotifications(): Promise<{
  items: AppNotification[];
  unread: number;
}> {
  const response = await strapiFetchOrNull<{
    data: AppNotification[];
    meta: { unread: number };
  }>('/notifications/me');

  // Null means not signed in, which is an empty inbox as far as any page is concerned.
  return { items: response?.data ?? [], unread: response?.meta?.unread ?? 0 };
}

export async function getUnreadCount(): Promise<number> {
  const response = await strapiFetchOrNull<{ data: { unread: number } }>(
    '/notifications/unread-count'
  );

  return response?.data?.unread ?? 0;
}
