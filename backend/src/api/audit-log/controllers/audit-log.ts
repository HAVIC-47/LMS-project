import type { Context } from 'koa';
import type { Core } from '@strapi/strapi';

/**
 * Reading the audit trail. Admin only, and read-only.
 *
 * There is no create, update or delete route. Entries are written by `recordAudit` from
 * inside the controllers that perform the actions, and nothing in the API can alter one
 * afterwards — a trail an administrator can quietly tidy is not a trail.
 */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: Context) {
    const query = ctx.query as { action?: string; search?: string; limit?: string };

    const filters: Record<string, unknown>[] = [];

    if (typeof query.action === 'string' && query.action.trim()) {
      filters.push({ action: query.action.trim() });
    }

    if (typeof query.search === 'string' && query.search.trim()) {
      const term = query.search.trim();
      filters.push({
        $or: [
          { actorLabel: { $containsi: term } },
          { targetLabel: { $containsi: term } },
          { summary: { $containsi: term } },
        ],
      });
    }

    // Capped rather than paginated. The panel answers "what changed recently"; an
    // administrator who needs the full history has the database.
    const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 500);

    const rows = await strapi.db.query('api::audit-log.audit-log').findMany({
      where: filters.length ? { $and: filters } : {},
      orderBy: { createdAt: 'desc' },
      limit,
    });

    const total = await strapi.db.query('api::audit-log.audit-log').count({});

    return {
      data: (rows as {
        documentId: string;
        action: string;
        actorLabel: string;
        targetType: string;
        targetId: string;
        targetLabel: string;
        summary: string;
        details: unknown;
        createdAt: string;
      }[]).map((row) => ({
        documentId: row.documentId,
        action: row.action,
        actorLabel: row.actorLabel,
        targetType: row.targetType,
        targetId: row.targetId,
        targetLabel: row.targetLabel,
        summary: row.summary,
        details: row.details,
        createdAt: row.createdAt,
      })),
      meta: { total, shown: rows.length },
    };
  },
});
