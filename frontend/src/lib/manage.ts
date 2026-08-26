'use client';

/**
 * Client-side helper for the management screens.
 *
 * Every mutation goes through `/api/manage/...`, which attaches the session cookie's JWT
 * on the server. Nothing here knows the token exists.
 */

export class ManageError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ManageError';
    this.status = status;
  }
}

async function send(path: string, method: 'POST' | 'PUT' | 'DELETE', body?: unknown) {
  const response = await fetch(`/api/manage/${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ManageError(
      (payload as { error?: string } | null)?.error ?? 'Could not save your changes.',
      response.status
    );
  }

  return payload;
}

/** Strapi expects writes wrapped in `{ data }`; the custom routes take a bare body. */
export const createEntry = (resource: string, data: Record<string, unknown>) =>
  send(resource, 'POST', { data });

export const updateEntry = (resource: string, documentId: string, data: Record<string, unknown>) =>
  send(`${resource}/${documentId}`, 'PUT', { data });

export const deleteEntry = (resource: string, documentId: string) =>
  send(`${resource}/${documentId}`, 'DELETE');

export const setPostPublished = (documentId: string, published: boolean) =>
  send(`blog-posts/${documentId}/${published ? 'publish' : 'unpublish'}`, 'POST', {});

export const setUserRole = (userId: number, role: string) =>
  send(`platform/users/${userId}/role`, 'PUT', { role });

/**
 * Blocking and the narrower feature restrictions.
 *
 * One call takes a partial set, so a screen with three switches does not have to send all
 * three every time somebody flips one — and cannot accidentally clear the other two.
 */
export const setUserAccess = (
  userId: number,
  access: Partial<{
    blocked: boolean;
    courseAccessRestricted: boolean;
    blogAccessRestricted: boolean;
  }>
) => send(`platform/users/${userId}/access`, 'PUT', access);

export const removeStudentFromCourse = (courseDocumentId: string, studentId: number) =>
  send(`courses/${courseDocumentId}/students/${studentId}`, 'DELETE');
