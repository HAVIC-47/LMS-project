import type { Core } from '@strapi/strapi';

/**
 * A handful of seeded ratings, so the catalog actually shows the feature.
 *
 * Without these, every card renders with no stars and "ratings on course cards" is a thing
 * you have to take on faith. A demo where the interesting behaviour is invisible is a demo
 * that has not been finished.
 *
 * Two rules keep the data honest rather than merely present:
 *
 *   **Only enrolled students rate.** The API refuses a rating from anybody who is not
 *   enrolled, and seed data that quietly bypasses its own rule is worse than no seed data —
 *   it produces a state the application could never reach on its own.
 *
 *   **Idempotent.** Enrollment and rating are both skipped when they already exist, so this
 *   runs on every boot alongside the rest of the catalog seed without stacking.
 *
 * The spread is deliberate: not every course is a 5, and one middling score is what makes
 * the others mean anything.
 */

const RATINGS: { slug: string; entries: { email: string; rating: number; body: string }[] }[] = [
  {
    slug: 'javascript-under-the-hood',
    entries: [
      {
        email: 'student@lms.test',
        rating: 5,
        body: 'The event loop lesson finally made async click. Worth it for that alone.',
      },
      {
        email: 'student2@lms.test',
        rating: 4,
        body: 'Dense in the best way. I re-read the closures lesson twice.',
      },
    ],
  },
  {
    slug: 'css-layout-from-first-principles',
    entries: [
      {
        email: 'student@lms.test',
        rating: 5,
        body: 'I have written CSS for years and still learned why my flex items overflow.',
      },
    ],
  },
  {
    slug: 'sql-and-relational-thinking',
    entries: [
      {
        email: 'student2@lms.test',
        rating: 4,
        body: 'The N+1 lesson is the one I have sent to three colleagues.',
      },
    ],
  },
  {
    slug: 'git-for-teams',
    entries: [
      {
        email: 'student@lms.test',
        rating: 3,
        body: 'Solid, but I wanted more on resolving real conflicts.',
      },
      { email: 'student2@lms.test', rating: 4, body: 'The reflog lesson saved me a week later.' },
    ],
  },
  {
    slug: 'web-security-essentials',
    entries: [
      {
        email: 'student@lms.test',
        rating: 5,
        body: 'Broken access control explained better here than anywhere I have read.',
      },
    ],
  },
];

export const seedRatings = async (strapi: Core.Strapi): Promise<void> => {
  let created = 0;

  for (const target of RATINGS) {
    const course = await strapi.db.query('api::course.course').findOne({
      where: { slug: target.slug },
      select: ['id', 'documentId'],
    });

    if (!course) continue;

    for (const entry of target.entries) {
      const student = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { email: entry.email },
        select: ['id'],
      });

      if (!student) continue;

      const already = await strapi.db.query('api::review.review').findOne({
        where: {
          targetType: 'course',
          targetDocumentId: course.documentId,
          author: { id: student.id },
        },
        select: ['id'],
      });

      if (already) continue;

      // Enroll first if needed. A rating from a non-enrolled student is a state the API
      // would refuse, and seeding one would misrepresent how the feature works.
      const enrolled = await strapi.db.query('api::enrollment.enrollment').findOne({
        where: { course: { id: course.id }, student: { id: student.id } },
        select: ['id'],
      });

      if (!enrolled) {
        await strapi.documents('api::enrollment.enrollment').create({
          data: {
            student: student.id,
            course: course.id,
            enrolledAt: new Date().toISOString(),
          },
        });
      }

      await strapi.documents('api::review.review').create({
        data: {
          rating: entry.rating,
          body: entry.body,
          targetType: 'course',
          targetDocumentId: course.documentId,
          author: student.id,
        },
      });

      created += 1;
    }
  }

  if (created > 0) {
    strapi.log.info(`[lms] seeded ${created} course rating${created === 1 ? '' : 's'}`);
  }
};
