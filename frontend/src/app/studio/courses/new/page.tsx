import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { Container, Panel, SectionHeading } from '@/components/ui/primitives';
import { CourseForm } from '@/components/studio/course-form';

export const metadata: Metadata = { title: 'New course' };

export default function NewCoursePage() {
  return (
    <div className="py-16 lg:py-20">
      <Container className="flex max-w-3xl flex-col gap-10">
        <Link
          href="/studio"
          className="group flex w-fit items-center gap-2 text-sm text-text-muted transition-colors hover:text-text"
        >
          <ArrowLeftIcon
            size={15}
            aria-hidden
            className="transition-transform duration-200 [transition-timing-function:var(--ease-settle)] group-hover:-translate-x-0.5"
          />
          Studio
        </Link>

        <SectionHeading
          as="h1"
          title="New course"
          lede="Create it first, then add lessons and a quiz. It stays invisible until you publish."
        />

        <Panel className="p-7">
          <CourseForm />
        </Panel>
      </Container>
    </div>
  );
}
