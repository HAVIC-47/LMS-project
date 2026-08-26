import type { Context } from 'koa';
import type { Core } from '@strapi/strapi';
import { ROLES, type AuthUser, type RoleType } from '../../../utils/permissions';
import { notify } from '../../../utils/notify';
import { AUDIT_ACTIONS, recordAudit } from '../../../utils/audit';
import { csvFilename, toCsv } from '../../../utils/csv';

/**
 * Admin-panel endpoints.
 *
 * This API has no content type of its own — it is a read model over everything else plus
 * the one privileged write in the platform (changing somebody's role).
 *
 * It is namespaced `/api/platform/...` rather than `/api/admin/...` so it can never be
 * confused with Strapi's own `/admin` panel routes, which are a different auth system
 * entirely (Strapi admin users are not application users).
 */

const MANAGEABLE_ROLES: RoleType[] = [
  ROLES.ADMIN,
  ROLES.CONTENT_MANAGER,
  ROLES.INSTRUCTOR,
  ROLES.STUDENT,
];

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * GET /api/platform/stats
   *
   * The numbers on the admin dashboard: users broken down by role, plus platform totals.
   */
  async stats(ctx: Context) {
    const roles = await strapi.db.query('plugin::users-permissions.role').findMany({});

    const usersPerRole = await Promise.all(
      roles.map(async (role: { id: number; name: string; type: string }) => ({
        role: role.type,
        name: role.name,
        count: await strapi.db
          .query('plugin::users-permissions.user')
          .count({ where: { role: { id: role.id } } }),
      }))
    );

    const [totalUsers, totalCourses, publishedCourses, totalLessons, totalQuizzes, totalEnrollments, totalAttempts, blogRows] =
      await Promise.all([
        strapi.db.query('plugin::users-permissions.user').count({}),
        strapi.db.query('api::course.course').count({}),
        strapi.db.query('api::course.course').count({ where: { isPublished: true } }),
        strapi.db.query('api::lesson.lesson').count({}),
        strapi.db.query('api::quiz.quiz').count({}),
        strapi.db.query('api::enrollment.enrollment').count({}),
        strapi.db.query('api::quiz-attempt.quiz-attempt').count({}),
        strapi.db.query('api::blog-post.blog-post').findMany({ select: ['documentId', 'publishedAt'] }),
      ]);

    // Draft & Publish stores a draft row and a published row per document, so counting
    // rows would double-count anything that has been published. Group by documentId first.
    const publishedDocuments = new Set<string>();
    const allDocuments = new Set<string>();

    for (const row of blogRows as { documentId: string; publishedAt: string | null }[]) {
      allDocuments.add(row.documentId);
      if (row.publishedAt) publishedDocuments.add(row.documentId);
    }

    return {
      data: {
        users: {
          total: totalUsers,
          byRole: usersPerRole.filter((entry) =>
            (MANAGEABLE_ROLES as string[]).includes(entry.role)
          ),
        },
        courses: { total: totalCourses, published: publishedCourses, drafts: totalCourses - publishedCourses },
        lessons: { total: totalLessons },
        quizzes: { total: totalQuizzes, attempts: totalAttempts },
        enrollments: { total: totalEnrollments },
        blogPosts: {
          total: allDocuments.size,
          published: publishedDocuments.size,
          drafts: allDocuments.size - publishedDocuments.size,
        },
      },
    };
  },

  /**
   * GET /api/platform/users
   *
   * The user table. This is a hand-written projection rather than opening up
   * `/api/users`: that route would also expose `resetPasswordToken` and
   * `confirmationToken` unless every field is sanitized correctly, and there is no reason
   * for the admin panel to see them at all.
   */
  async users(ctx: Context) {
    /**
     * Search and filters are applied in the query rather than in the browser.
     *
     * Filtering a list the client already holds is fine until the list is the whole user
     * table, at which point every admin page load ships every account to the browser just
     * so it can hide most of them. Doing it here also means the filters keep working when
     * the table outgrows one page.
     *
     * `$containsi` is case-insensitive, so searching "Dana" finds "dana@example.com".
     */
    const query = ctx.query as {
      search?: string;
      role?: string;
      status?: string;
    };

    const search = typeof query.search === 'string' ? query.search.trim() : '';
    const role = typeof query.role === 'string' ? query.role.trim() : '';
    const status = typeof query.status === 'string' ? query.status.trim() : '';

    const filters: Record<string, unknown>[] = [];

    if (search) {
      filters.push({
        $or: [
          { username: { $containsi: search } },
          { email: { $containsi: search } },
          { displayName: { $containsi: search } },
        ],
      });
    }

    // Checked against the known set rather than passed through: an unknown role would
    // silently match nothing, which looks identical to "no users" and is not.
    if (role && MANAGEABLE_ROLES.includes(role as RoleType)) {
      filters.push({ role: { type: role } });
    }

    if (status === 'blocked') filters.push({ blocked: true });
    if (status === 'active') filters.push({ blocked: false });
    if (status === 'unconfirmed') filters.push({ confirmed: false });

    const users = await strapi.db.query('plugin::users-permissions.user').findMany({
      where: filters.length ? { $and: filters } : {},
      populate: { role: true },
      orderBy: { createdAt: 'desc' },
    });

    const courseCounts = await strapi.db.query('api::course.course').findMany({
      populate: { owner: true },
      select: ['id'],
    });

    const ownedByUser = new Map<number, number>();

    for (const course of courseCounts as { owner?: { id: number } | null }[]) {
      if (!course.owner) continue;
      ownedByUser.set(course.owner.id, (ownedByUser.get(course.owner.id) ?? 0) + 1);
    }

    return {
      data: await Promise.all(
        users.map(
          async (user: {
            id: number;
            documentId: string;
            username: string;
            email: string;
            confirmed: boolean;
            blocked: boolean;
            createdAt: string;
            displayName?: string | null;
            avatarUrl?: string | null;
            courseAccessRestricted?: boolean;
            blogAccessRestricted?: boolean;
            role?: { id: number; name: string; type: string } | null;
          }) => ({
            id: user.id,
            documentId: user.documentId,
            username: user.username,
            email: user.email,
            confirmed: user.confirmed,
            blocked: user.blocked,
            createdAt: user.createdAt,
            displayName: user.displayName ?? null,
            avatarUrl: user.avatarUrl ?? null,
            courseAccessRestricted: user.courseAccessRestricted ?? false,
            blogAccessRestricted: user.blogAccessRestricted ?? false,
            role: user.role ? { id: user.role.id, name: user.role.name, type: user.role.type } : null,
            ownedCourses: ownedByUser.get(user.id) ?? 0,
            enrollments: await strapi.db
              .query('api::enrollment.enrollment')
              .count({ where: { student: { id: user.id } } }),
          })
        )
      ),
    };
  },

  /**
   * GET /api/platform/users.csv
   *
   * The user table as a spreadsheet, honouring the same filters as the list it mirrors, so
   * "export what I am looking at" does what it says rather than exporting everything.
   */
  async exportUsers(ctx: Context) {
    const query = ctx.query as { search?: string; role?: string; status?: string };

    const filters: Record<string, unknown>[] = [];
    const search = typeof query.search === 'string' ? query.search.trim() : '';
    const role = typeof query.role === 'string' ? query.role.trim() : '';
    const status = typeof query.status === 'string' ? query.status.trim() : '';

    if (search) {
      filters.push({
        $or: [
          { username: { $containsi: search } },
          { email: { $containsi: search } },
          { displayName: { $containsi: search } },
        ],
      });
    }

    if (role && MANAGEABLE_ROLES.includes(role as RoleType)) {
      filters.push({ role: { type: role } });
    }

    if (status === 'blocked') filters.push({ blocked: true });
    if (status === 'active') filters.push({ blocked: false });
    if (status === 'unconfirmed') filters.push({ confirmed: false });

    const users = await strapi.db.query('plugin::users-permissions.user').findMany({
      where: filters.length ? { $and: filters } : {},
      populate: { role: true },
      orderBy: { createdAt: 'desc' },
    });

    const rows = (users as {
      username: string;
      email: string;
      displayName?: string | null;
      confirmed: boolean;
      blocked: boolean;
      courseAccessRestricted?: boolean;
      blogAccessRestricted?: boolean;
      createdAt: string;
      role?: { type: string } | null;
    }[]).map((user) => [
      user.username,
      user.displayName ?? '',
      user.email,
      user.role?.type ?? 'none',
      user.createdAt,
      user.confirmed ? 'yes' : 'no',
      user.blocked ? 'yes' : 'no',
      user.courseAccessRestricted ? 'yes' : 'no',
      user.blogAccessRestricted ? 'yes' : 'no',
    ]);

    ctx.set('Content-Type', 'text/csv; charset=utf-8');
    ctx.set('Content-Disposition', `attachment; filename="${csvFilename('users')}"`);

    ctx.body = toCsv(
      [
        'username',
        'display name',
        'email',
        'role',
        'joined',
        'confirmed',
        'blocked',
        'course access restricted',
        'blog access restricted',
      ],
      rows
    );
  },

  /**
   * PUT /api/platform/users/:id/access
   *
   * Blocking, and the two narrower feature restrictions. Separate from role assignment
   * because they answer a different question: a role says what someone is for, these say
   * what they are currently allowed to do, and conflating them would mean demoting somebody
   * to silence them.
   *
   * Only the three flags are writable. Nothing here can touch a role, a password or an
   * email, so this endpoint cannot be turned into a general user editor by a crafted body.
   */
  async updateUserAccess(ctx: Context) {
    const actor = ctx.state.user as AuthUser;
    const targetId = Number(ctx.params.id);

    if (!Number.isInteger(targetId) || targetId <= 0) {
      return ctx.badRequest('A numeric user id is required');
    }

    const body = (ctx.request.body ?? {}) as Record<string, unknown>;
    const payload = (body.data ?? body) as Record<string, unknown>;

    const data: Record<string, boolean> = {};

    for (const key of ['blocked', 'courseAccessRestricted', 'blogAccessRestricted'] as const) {
      if (key in payload) {
        if (typeof payload[key] !== 'boolean') {
          return ctx.badRequest(`\`${key}\` must be true or false`);
        }
        data[key] = payload[key] as boolean;
      }
    }

    if (Object.keys(data).length === 0) {
      return ctx.badRequest('Nothing to update');
    }

    const target = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: targetId },
      populate: { role: true },
    });

    if (!target) return ctx.notFound('User not found');

    // Blocking yourself out of the only account that can unblock anyone is not a decision
    // the UI should be able to make by accident. Restrictions are still allowed on self —
    // they are reversible from this same screen.
    if (targetId === actor.id && data.blocked === true) {
      return ctx.badRequest('You cannot block your own account');
    }

    await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: targetId },
      data,
    });

    // One entry per flag that actually moved. Recording "access updated" would leave the
    // log unable to answer the only question anybody asks it — which restriction, and when.
    const AUDITED: [keyof typeof data, string, string, string][] = [
      ['blocked', AUDIT_ACTIONS.USER_BLOCKED, AUDIT_ACTIONS.USER_UNBLOCKED, 'sign-in'],
      [
        'courseAccessRestricted',
        AUDIT_ACTIONS.COURSE_ACCESS_RESTRICTED,
        AUDIT_ACTIONS.COURSE_ACCESS_RESTORED,
        'course access',
      ],
      [
        'blogAccessRestricted',
        AUDIT_ACTIONS.BLOG_ACCESS_RESTRICTED,
        AUDIT_ACTIONS.BLOG_ACCESS_RESTORED,
        'blog access',
      ],
    ];

    for (const [key, onAction, offAction, label] of AUDITED) {
      if (!(key in data)) continue;

      const turnedOn = data[key] === true;

      await recordAudit(strapi, {
        action: (turnedOn ? onAction : offAction) as typeof AUDIT_ACTIONS.USER_BLOCKED,
        actor,
        targetType: 'user',
        targetId: target.id,
        targetLabel: target.username,
        summary: `${turnedOn ? 'Restricted' : 'Restored'} ${label} for ${target.username}`,
        details: { field: key, value: turnedOn },
      });
    }

    return {
      data: {
        id: target.id,
        username: target.username,
        blocked: data.blocked ?? target.blocked,
        courseAccessRestricted:
          data.courseAccessRestricted ?? target.courseAccessRestricted ?? false,
        blogAccessRestricted: data.blogAccessRestricted ?? target.blogAccessRestricted ?? false,
      },
    };
  },

  /**
   * PUT /api/platform/users/:id/role   body: { role: 'instructor' }
   *
   * `:id` is the numeric user id — users-permissions addresses users by numeric id, not
   * by documentId like the content APIs do.
   */
  async updateUserRole(ctx: Context & { params: { id: string } }) {
    const actor = ctx.state.user as AuthUser;

    const targetId = Number(ctx.params.id);

    if (!Number.isInteger(targetId)) {
      return ctx.badRequest('User id must be numeric');
    }

    const body = (ctx.request.body ?? {}) as { role?: string; data?: { role?: string } };
    const requestedRole = body.role ?? body.data?.role;

    if (!requestedRole || !(MANAGEABLE_ROLES as string[]).includes(requestedRole)) {
      return ctx.badRequest(`\`role\` must be one of: ${MANAGEABLE_ROLES.join(', ')}`);
    }

    const target = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: targetId },
      populate: { role: true },
    });

    if (!target) {
      return ctx.notFound('User not found');
    }

    const nextRole = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: requestedRole },
    });

    if (!nextRole) {
      return ctx.badRequest(`Role "${requestedRole}" does not exist`);
    }

    /**
     * Guard against locking everybody out of the admin panel. Demoting the last remaining
     * admin would leave a platform whose roles can never be changed again — recoverable
     * only by editing the database by hand.
     */
    if (target.role?.type === ROLES.ADMIN && requestedRole !== ROLES.ADMIN) {
      const adminCount = await strapi.db
        .query('plugin::users-permissions.user')
        .count({ where: { role: { type: ROLES.ADMIN } } });

      if (adminCount <= 1) {
        return ctx.badRequest('Cannot remove the last admin — promote another user first');
      }
    }

    const updated = await strapi
      .plugin('users-permissions')
      .service('user')
      .edit(target.id, { role: nextRole.id });

    strapi.log.info(
      `[platform] ${actor.email} changed role of ${target.email}: ${target.role?.type ?? 'none'} -> ${requestedRole}`
    );

    await recordAudit(strapi, {
      action: AUDIT_ACTIONS.ROLE_CHANGED,
      actor,
      targetType: 'user',
      targetId: target.id,
      targetLabel: target.username,
      summary: `${target.username}: ${target.role?.type ?? 'none'} → ${requestedRole}`,
      details: { from: target.role?.type ?? 'none', to: requestedRole },
    });

    await notify(strapi, {
      recipientId: target.id,
      actorId: actor.id,
      type: 'role-changed',
      title: `Your role is now ${nextRole.name}`,
      body: 'What you can do on the platform has changed.',
      href: '/dashboard',
    });

    return {
      data: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        role: { id: nextRole.id, name: nextRole.name, type: nextRole.type },
      },
    };
  },
});
