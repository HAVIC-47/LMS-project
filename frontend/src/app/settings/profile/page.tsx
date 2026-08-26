import type { Metadata } from 'next';
import { Container, SectionHeading } from '@/components/ui/primitives';
import { ProfileForm } from '@/components/settings/profile-form';
import { requireUser } from '@/lib/guards';

export const metadata: Metadata = {
  title: 'Edit profile',
};

/**
 * Edit your own profile.
 *
 * `requireUser` handles the redirect for a signed-out visitor, and there is nothing else
 * to guard: the route edits whoever is holding the session and takes no id, so it cannot
 * be pointed at another account. Every role gets the same screen — a profile is not a
 * staff feature.
 */
export default async function ProfileSettingsPage() {
  const user = await requireUser();

  return (
    <div className="py-16 lg:py-20">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          as="h1"
          title="Edit profile"
          lede="How you appear to everyone else on CourseCatalyst."
        />

        <ProfileForm user={user} />
      </Container>
    </div>
  );
}
