import { requireRole } from '@/lib/guards';
import { ROLES } from '@/lib/types';

/**
 * Authoring area.
 *
 * The role check runs once here rather than in every page below it. It is a UX guard, not
 * the boundary: Strapi re-checks the role and the per-course ownership on each request the
 * pages make, so deleting this file would change what a student SEES and nothing about
 * what they can reach.
 */
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  await requireRole([ROLES.ADMIN, ROLES.CONTENT_MANAGER, ROLES.INSTRUCTOR]);

  return <>{children}</>;
}
