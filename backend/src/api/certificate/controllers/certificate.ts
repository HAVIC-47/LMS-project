import type { Context } from 'koa';
import type { Core } from '@strapi/strapi';
import type { AuthUser } from '../../../utils/permissions';

/**
 * Certificates: one public read, one private list.
 *
 * `verify` is deliberately open. A certificate whose verification page needs a login is a
 * certificate nobody can check, which is the only thing a certificate is for. What keeps
 * that safe is the serial: twelve random characters rather than a sequential id, so the
 * page cannot be used to enumerate everybody who has passed a course.
 *
 * The response is a projection of snapshots taken when the certificate was issued, not a
 * join. Someone verifying a two-year-old certificate should see what it said on the day.
 */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /** GET /api/certificates/verify/:serial — public. */
  async verify(ctx: Context) {
    const serial = String(ctx.params.serial ?? '').trim().toUpperCase();

    if (!serial) return ctx.badRequest('A serial is required');

    const certificate = await strapi.db.query('api::certificate.certificate').findOne({
      where: { serial },
      populate: { course: true, student: true },
    });

    if (!certificate) return ctx.notFound('No certificate with that serial');

    return {
      data: {
        serial: certificate.serial,
        studentName: certificate.studentLabel,
        // Username rather than the display name, so the page can link to the profile.
        studentUsername: certificate.student?.username ?? null,
        courseTitle: certificate.courseLabel,
        courseSlug: certificate.course?.slug ?? null,
        issuedAt: certificate.issuedAt,
        lessonsCompleted: certificate.lessonsCompleted,
        bestScore: certificate.bestScore ?? null,
      },
    };
  },

  /** GET /api/certificates/me — the signed-in student's own. */
  async me(ctx: Context) {
    const user = ctx.state.user as AuthUser;

    const rows = await strapi.db.query('api::certificate.certificate').findMany({
      where: { student: { id: user.id } },
      populate: { course: true },
      orderBy: { issuedAt: 'desc' },
    });

    return {
      data: (rows as {
        serial: string;
        courseLabel: string;
        issuedAt: string;
        lessonsCompleted: number;
        bestScore: number | null;
        course?: { slug: string; coverImageUrl: string | null } | null;
      }[]).map((row) => ({
        serial: row.serial,
        courseTitle: row.courseLabel,
        courseSlug: row.course?.slug ?? null,
        coverImageUrl: row.course?.coverImageUrl ?? null,
        issuedAt: row.issuedAt,
        lessonsCompleted: row.lessonsCompleted,
        bestScore: row.bestScore ?? null,
      })),
    };
  },
});
