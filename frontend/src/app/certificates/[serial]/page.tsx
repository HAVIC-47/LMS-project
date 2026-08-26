import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircleIcon, SealCheckIcon } from '@phosphor-icons/react/dist/ssr';
import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/primitives';
import { formatDate } from '@/lib/format';
import { verifyCertificate } from '@/lib/api/extras';

type Props = { params: Promise<{ serial: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { serial } = await params;
  const certificate = await verifyCertificate(serial);

  if (!certificate) return { title: 'Certificate not found' };

  return {
    title: `${certificate.studentName} — ${certificate.courseTitle}`,
    description: `Certificate ${certificate.serial}, issued ${formatDate(certificate.issuedAt)}.`,
  };
}

/**
 * Certificate verification. Public, deliberately.
 *
 * A certificate whose verification page requires a login is a certificate nobody can check,
 * which removes the only reason to issue one. What keeps that safe is the serial: twelve
 * random characters rather than a sequential id, so the page cannot be walked to enumerate
 * everybody who has passed a course.
 *
 * Everything shown is a snapshot taken when the certificate was issued, not a live join —
 * someone verifying a two-year-old certificate should see what it said on the day, not what
 * the course happens to be called now.
 */
export default async function CertificatePage({ params }: Props) {
  const { serial } = await params;
  const certificate = await verifyCertificate(serial);

  if (!certificate) notFound();

  return (
    <div className="py-16 lg:py-24">
      <Container className="flex flex-col items-center gap-10">
        <div className="flex w-full max-w-2xl flex-col items-center gap-8 rounded-card border border-line-strong bg-surface-raised p-8 text-center shadow-[var(--shadow-lifted)] sm:p-12">
          <span className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-ink-on">
            <SealCheckIcon size={28} weight="fill" aria-hidden />
          </span>

          <div className="flex flex-col gap-3">
            <span className="microlabel">Certificate of completion</span>
            <h1 className="display-tight font-serif text-[2rem] font-normal sm:text-[2.75rem]">
              {certificate.studentName}
            </h1>
            <p className="text-lg text-text-muted">
              completed{' '}
              {certificate.courseSlug ? (
                <Link
                  href={`/courses/${certificate.courseSlug}`}
                  className="text-text underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-text"
                >
                  {certificate.courseTitle}
                </Link>
              ) : (
                <span className="text-text">{certificate.courseTitle}</span>
              )}
            </p>
          </div>

          <dl className="flex flex-wrap items-start justify-center gap-x-12 gap-y-6 border-y border-line py-6">
            <Figure value={formatDate(certificate.issuedAt)} label="issued" />
            <Figure value={certificate.lessonsCompleted} label="lessons completed" />
            <Figure
              value={certificate.bestScore === null ? '—' : `${certificate.bestScore}%`}
              label="best quiz mark"
            />
          </dl>

          <div className="flex flex-col items-center gap-2">
            <span className="microlabel">Serial</span>
            <span className="font-mono text-lg tracking-[0.15em] text-text">
              {certificate.serial}
            </span>
          </div>

          <p className="flex items-center gap-2 text-sm text-text-muted">
            <CheckCircleIcon size={16} weight="fill" aria-hidden className="text-accent" />
            Verified against CourseCatalyst records
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {certificate.studentUsername ? (
            <ButtonLink href={`/u/${certificate.studentUsername}`} variant="outline" size="sm">
              View profile
            </ButtonLink>
          ) : null}
          <ButtonLink href="/courses" variant="ghost" size="sm">
            Browse courses
          </ButtonLink>
        </div>
      </Container>
    </div>
  );
}

function Figure({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <dd className="font-mono text-xl tabular-nums text-text">{value}</dd>
      <dt className="microlabel">{label}</dt>
    </div>
  );
}
