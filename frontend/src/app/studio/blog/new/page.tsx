import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { Container, Panel, SectionHeading } from '@/components/ui/primitives';
import { PostForm } from '@/components/studio/post-form';
import { requireRole } from '@/lib/guards';
import { ROLES } from '@/lib/types';

export const metadata: Metadata = { title: 'New post' };

export default async function NewPostPage() {
  await requireRole([ROLES.ADMIN, ROLES.CONTENT_MANAGER]);

  return (
    <div className="py-16 lg:py-20">
      <Container className="flex max-w-3xl flex-col gap-10">
        <Link
          href="/studio/blog"
          className="group flex w-fit items-center gap-2 text-sm text-text-muted transition-colors hover:text-text"
        >
          <ArrowLeftIcon
            size={15}
            aria-hidden
            className="transition-transform duration-200 [transition-timing-function:var(--ease-settle)] group-hover:-translate-x-0.5"
          />
          Blog
        </Link>

        <SectionHeading
          as="h1"
          title="New post"
          lede="It is created as a draft. Publishing is a separate step."
        />

        <Panel className="p-7">
          <PostForm />
        </Panel>
      </Container>
    </div>
  );
}
