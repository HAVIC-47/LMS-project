import Link from 'next/link';
import { ArrowUpRightIcon, NotePencilIcon } from '@phosphor-icons/react/dist/ssr';
import { ButtonLink } from '@/components/ui/button';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { BarChart, ChartCard, Ring, StackedBar } from '@/components/ui/charts';
import { formatDate } from '@/lib/format';
import { getBlogInsights } from '@/lib/api/insights';

/**
 * The Content Manager dashboard.
 *
 * Focused on the blog, because that is what the role is for: the permission matrix gives
 * "write / manage blog posts" to exactly this role and the admin, and gives instructors
 * none of it. A dashboard that led with courses would be showing this person somebody
 * else's job.
 *
 * The number that leads is engagement per published post rather than a post count. A total
 * only says how long someone has been writing; the average says whether the writing is
 * landing.
 */
export async function WriterDashboard() {
  const insights = await getBlogInsights();

  if (!insights || insights.posts.length === 0) {
    return (
      <EmptyState
        icon={<NotePencilIcon size={32} aria-hidden />}
        title="Nothing written yet"
        description="Write a post and this page will track how it is published, read and discussed."
        action={
          <ButtonLink href="/studio/blog/new" withArrow>
            Write a post
          </ButtonLink>
        }
      />
    );
  }

  const { posts, months, summary } = insights;

  const published = posts.filter((post) => post.isPublished);

  const engagementBars = published
    .slice()
    .sort((a, b) => b.likes + b.comments - (a.likes + a.comments))
    .slice(0, 6)
    .map((post) => ({
      label: post.title,
      value: post.likes + post.comments,
      hint: `${post.title}: ${post.likes} likes, ${post.comments} comments`,
    }));

  const publishedShare = summary.total === 0 ? 0 : Math.round((summary.published / summary.total) * 100);

  return (
    <div className="flex flex-col gap-8">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-4">
        <Tile value={summary.published} label="published" />
        <Tile value={summary.drafts} label="drafts" />
        <Tile value={summary.likes} label="likes" />
        <Tile value={summary.comments} label="comments" />
      </dl>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <ChartCard title="Your desk" caption="How much of what you have written is live.">
          <div className="flex flex-col items-center gap-6 py-2">
            <Ring
              value={publishedShare}
              label="Published"
              caption={`${summary.averageEngagement} reactions per post on average`}
            />
            <StackedBar
              className="w-full"
              segments={[
                { label: 'published', value: summary.published, tone: 'accent' },
                { label: 'drafts', value: summary.drafts, tone: 'faint' },
              ]}
            />
          </div>
        </ChartCard>

        <div className="flex flex-col gap-6">
          <ChartCard title="Published per month" caption="The last six months.">
            <BarChart
              data={months.map((month) => ({ label: month.label, value: month.published }))}
              height={110}
            />
          </ChartCard>

          <ChartCard title="Most discussed" caption="Likes and comments combined.">
            {engagementBars.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-muted">
                Nothing published yet, so nothing to react to.
              </p>
            ) : (
              <BarChart data={engagementBars} height={110} />
            )}
          </ChartCard>
        </div>
      </div>

      <section className="flex flex-col gap-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-serif text-2xl">Everything you have written</h2>
          <Link href="/studio/blog" className="text-sm font-medium text-accent-text hover:underline">
            Open the blog editor
          </Link>
        </div>

        <ul className="flex flex-col">
          {posts.map((post) => (
            <li key={post.documentId}>
              <Link
                href={`/studio/blog/${post.documentId}`}
                className="group flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line py-5 transition-colors duration-300 [transition-timing-function:var(--ease-settle)] last:border-b hover:border-line-strong"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-text transition-colors group-hover:text-accent-text">
                      {post.title}
                    </span>
                    {post.isPublished ? null : <Badge tone="neutral">Draft</Badge>}
                    <ArrowUpRightIcon
                      size={14}
                      aria-hidden
                      className="-translate-x-1 opacity-0 transition-[opacity,transform] duration-300 [transition-timing-function:var(--ease-settle)] group-hover:translate-x-0 group-hover:opacity-100"
                    />
                  </span>
                  <span className="text-sm text-text-subtle">
                    {post.publishedAt
                      ? `Published ${formatDate(post.publishedAt)}`
                      : `Edited ${formatDate(post.updatedAt)}`}
                  </span>
                </div>

                <dl className="flex items-center gap-8 text-sm">
                  <Cell value={post.likes} label="likes" />
                  <Cell value={post.comments} label="comments" />
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Tile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col gap-1 bg-surface-raised p-5">
      <dd className="font-mono text-2xl tabular-nums text-text">{value}</dd>
      <dt className="microlabel">{label}</dt>
    </div>
  );
}

function Cell({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <dd className="font-mono tabular-nums text-text">{value}</dd>
      <dt className="microlabel">{label}</dt>
    </div>
  );
}
