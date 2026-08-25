import { requireRole } from '@/lib/guards';
import { ROLES } from '@/lib/types';

/** "A dedicated admin dashboard, accessible only to the admin role." */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole([ROLES.ADMIN]);

  return <>{children}</>;
}
