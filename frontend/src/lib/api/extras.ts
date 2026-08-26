import 'server-only';

import { strapiFetchOrNull, strapiQuery } from '@/lib/strapi';

/**
 * Reads for the four features added after the core product: attempt limits, certificates,
 * reviews and the audit trail.
 *
 * Each is scoped on the backend — the audit trail is admin-only, `certificates/me` takes
 * the student from the token, and reviews are public because ratings on a published course
 * are part of the catalog. Nothing here re-checks that; a second opinion about a decision
 * already made is two things to keep in step.
 */

/* ------------------------------------------------------------------ attempts ---- */

export type AttemptStatus = {
  used: number;
  maxAttempts: number;
  /** Null when the quiz is uncapped. */
  remaining: number | null;
  cooldownMinutes: number;
  availableAt: string | null;
  allowed: boolean;
  reason: string;
};

/* -------------------------------------------------------------- certificates ---- */

export type MyCertificate = {
  serial: string;
  courseTitle: string;
  courseSlug: string | null;
  coverImageUrl: string | null;
  issuedAt: string;
  lessonsCompleted: number;
  bestScore: number | null;
};

export type VerifiedCertificate = {
  serial: string;
  studentName: string;
  studentUsername: string | null;
  courseTitle: string;
  courseSlug: string | null;
  issuedAt: string;
  lessonsCompleted: number;
  bestScore: number | null;
};

export async function getMyCertificates(): Promise<MyCertificate[]> {
  const response = await strapiFetchOrNull<{ data: MyCertificate[] }>('/certificates/me');
  return response?.data ?? [];
}

export async function verifyCertificate(serial: string): Promise<VerifiedCertificate | null> {
  if (!serial) return null;

  const response = await strapiFetchOrNull<{ data: VerifiedCertificate }>(
    `/certificates/verify/${encodeURIComponent(serial)}`,
    // A certificate never changes after it is issued, but it can be the first thing a
    // stranger loads, so it is fetched without the session rather than as the viewer.
    { auth: false, cache: 'no-store' }
  );

  return response?.data ?? null;
}

/* ------------------------------------------------------------------- reviews ---- */

export type Review = {
  documentId: string;
  rating: number;
  body: string | null;
  createdAt: string;
  editedAt: string | null;
  author: {
    id: number;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
};

export type ReviewSummary = {
  count: number;
  average: number;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
  reviews: Review[];
  /** The caller's own, so the form opens pre-filled rather than writing a second one. */
  mine: Review | null;
};

export async function getReviews(
  targetType: 'course' | 'post',
  targetDocumentId: string
): Promise<ReviewSummary | null> {
  const response = await strapiFetchOrNull<{ data: ReviewSummary }>(
    `/reviews/${targetType}/${targetDocumentId}`,
    { cache: 'no-store' }
  );

  return response?.data ?? null;
}

/* --------------------------------------------------------------- audit trail ---- */

export type AuditEntry = {
  documentId: string;
  action: string;
  actorLabel: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  summary: string;
  details: Record<string, unknown> | null;
  createdAt: string;
};

export type AuditFilters = { action?: string; search?: string };

export async function getAuditLog(
  filters: AuditFilters = {}
): Promise<{ entries: AuditEntry[]; total: number }> {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => typeof value === 'string' && value.length > 0)
  );

  const query = Object.keys(params).length > 0 ? strapiQuery(params) : '';

  const response = await strapiFetchOrNull<{
    data: AuditEntry[];
    meta: { total: number };
  }>(`/audit-logs${query}`, { cache: 'no-store' });

  return { entries: response?.data ?? [], total: response?.meta?.total ?? 0 };
}

/**
 * Human wording for each action.
 *
 * A map rather than a formatter, because these are a closed set written by the backend and
 * an unrecognised one should show its raw key instead of a wrong guess.
 */
export const AUDIT_LABELS: Record<string, string> = {
  'role.changed': 'Role changed',
  'user.blocked': 'Account blocked',
  'user.unblocked': 'Account unblocked',
  'access.course.restricted': 'Courses restricted',
  'access.course.restored': 'Course access restored',
  'access.blog.restricted': 'Blog restricted',
  'access.blog.restored': 'Blog access restored',
  'enrollment.removed': 'Student un-enrolled',
};
