import 'server-only';

import { cookies } from 'next/headers';

/**
 * The only place the frontend talks to Strapi.
 *
 * Two rules make the whole auth model work:
 *
 *   1. `import 'server-only'` - if any Client Component ever imports this file, the build
 *      fails instead of shipping the token-reading code to the browser.
 *   2. The JWT is read from an httpOnly cookie here, on the server. The browser never sees
 *      it, so an XSS bug on the page cannot steal a session.
 *
 * The browser talks to `/api/auth/*` route handlers on this Next server; those handlers
 * talk to Strapi. Strapi's origin is never called directly from the client.
 */

export const SESSION_COOKIE = 'lms_token';

export const STRAPI_URL = process.env.STRAPI_URL ?? 'http://127.0.0.1:1337';

export class StrapiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'StrapiError';
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Pass false for public reads that should not carry the caller's identity. */
  auth?: boolean;
  /** Explicit token, for the login flow where no cookie exists yet. */
  token?: string;
  /** Next.js fetch cache controls. Defaults to no-store because most data is per-user. */
  cache?: RequestCache;
  revalidate?: number;
  tags?: string[];
};

const readTokenFromCookie = async (): Promise<string | null> => {
  // `cookies()` is async from Next 15 onwards.
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
};

const buildUrl = (path: string) => {
  const normalised = path.startsWith('/') ? path : `/${path}`;
  return `${STRAPI_URL}${normalised.startsWith('/api') ? normalised : `/api${normalised}`}`;
};

/**
 * Extracts something human-readable out of a Strapi error envelope, which looks like
 * `{ error: { status, name, message, details } }`.
 */
const readErrorMessage = (payload: unknown, fallback: string): string => {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = (payload as { error?: { message?: string } }).error;
    if (error?.message) return error.message;
  }

  return fallback;
};

export async function strapiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, token, cache, revalidate, tags } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const bearer = token ?? (auth ? await readTokenFromCookie() : null);

  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  }

  const nextOptions =
    revalidate !== undefined || tags
      ? { next: { ...(revalidate !== undefined ? { revalidate } : {}), ...(tags ? { tags } : {}) } }
      : {};

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    // Per-user data must never be cached across requests. Public reads opt in explicitly
    // by passing `revalidate`.
    ...(cache ? { cache } : revalidate === undefined ? { cache: 'no-store' as RequestCache } : {}),
    ...nextOptions,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new StrapiError(
      readErrorMessage(payload, `Request to ${path} failed with ${response.status}`),
      response.status,
      payload
    );
  }

  return payload as T;
}

/**
 * Same call, but a 401/403/404 resolves to null instead of throwing.
 *
 * Used where "not allowed" and "not there" are both just an empty state on the page, so a
 * missing course renders a 404 view rather than an error boundary.
 */
export async function strapiFetchOrNull<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T | null> {
  try {
    return await strapiFetch<T>(path, options);
  } catch (error) {
    if (error instanceof StrapiError && [401, 403, 404].includes(error.status)) {
      return null;
    }

    throw error;
  }
}

/** Builds a Strapi query string from a nested object, matching its `qs` bracket syntax. */
export function strapiQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();

  const walk = (value: unknown, prefix: string) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      value.forEach((entry, index) => walk(entry, `${prefix}[${index}]`));
      return;
    }

    if (typeof value === 'object') {
      for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
        walk(entry, `${prefix}[${key}]`);
      }
      return;
    }

    search.append(prefix, String(value));
  };

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    if (typeof value === 'object') {
      walk(value, key);
    } else {
      search.append(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `?${query}` : '';
}
