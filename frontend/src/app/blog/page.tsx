import type { Metadata } from 'next';
import { NotePencilIcon } from '@phosphor-icons/react/dist/ssr';
import { Container, EmptyState, SectionHeading } from '@/components/ui/primitives';
import { Reveal } from '@/components/ui/reveal';
import { PostCard } from '@/components/marketing/post-card';
import { ButtonLink } from '@/components/ui/button';
import { FilterBar } from '@/components/ui/filter-bar';
import { cn } from '@/lib/cn';
import { matches, oneOf, SORT_KEYS, SORT_LABELS, sortBy, type SortKey } from '@/lib/list-filters';
import { getPublishedPosts } from '@/lib/api/public';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Notes on learning, teaching and building the platform.',
};

/** Cards per line on desktop. Also the chunk size, so the two must stay in step. */
const ROW_SIZE = 3;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Blog index.
 *
 * Only published posts reach this page, and that is decided on the backend rather than
 * here. The controller pins anonymous and non-editorial callers to `status=published`, so
 * a draft cannot be surfaced by appending a query parameter to the API call underneath.
 *
 * Every card is the same size. The lead used to take a permanent double-width tile, which
 * answered "give the eye somewhere to land" by deciding for the reader which post was
 * worth landing on. Instead the row expands under the pointer: the reader picks, one card
 * at a time, and the grid stays honest about the fact that all of these are just posts.
 *
 * Desktop only, and deliberately. On a phone there is no pointer to expand with, and a
 * card that opens on tap would be a second meaning for a tap that already navigates.
 */
export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; author?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const posts = await getPublishedPosts();

  if (posts.length === 0) {
    return (
      <div className="py-16 lg:py-20">
        <Container className="flex flex-col gap-12">
          <SectionHeading as="h1" title="Blog" />
          <EmptyState
            icon={<NotePencilIcon size={32} aria-hidden />}
            title="Nothing published yet"
            description="Posts appear here once an editor publishes them. Drafts stay private until then."
          />
        </Container>
      </div>
    );
  }

  // Author options come from the posts themselves rather than from a user lookup: no role
  // may read the user collection, and the only authors worth offering are the ones who
  // actually have something published here.
  const authors = [...new Set(posts.map((post) => post.author?.username).filter(Boolean))].sort() as string[];

  const term = (params.q ?? '').trim();
  const author = params.author && authors.includes(params.author) ? params.author : null;
  const sort = oneOf<SortKey>(params.sort, SORT_KEYS);

  const filtered = posts.filter((post) => {
    if (author && post.author?.username !== author) return false;
    return matches(term, post.title, post.excerpt, post.body, post.author?.username);
  });

  const visible = sortBy(filtered, sort, (post) => ({
    date: post.publishedAt ?? post.createdAt,
    title: post.title,
  }));

  const rows = chunk(visible, ROW_SIZE);

  return (
    <div className="py-16 lg:py-20">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          as="h1"
          title="Blog"
          lede="Notes on learning, teaching and how this platform is put together."
        />

        <FilterBar
          searchLabel="Search posts by title, summary or body"
          searchPlaceholder="Search posts"
          noun="post"
          total={visible.length}
          selects={[
            {
              name: 'author',
              label: 'Filter by author',
              options: [
                { value: '', label: 'All authors' },
                ...authors.map((name) => ({ value: name, label: name })),
              ],
            },
            {
              name: 'sort',
              label: 'Sort posts',
              options: [
                { value: '', label: 'Newest first' },
                ...SORT_KEYS.filter((key) => key !== 'newest').map((key) => ({
                  value: key,
                  label: SORT_LABELS[key],
                })),
              ],
            },
          ]}
        />

        {/*
          Two layouts in one tree.

          Below `lg` this is an ordinary grid and the row wrappers are `display: contents`,
          so every card flows into the same grid and the chunking is invisible — a row of
          three does not turn into a ragged 2 + 1 on a tablet.

          From `lg` each row becomes its own flex line, which is what makes the expansion
          possible: hovering a card raises its `flex-grow`, and because the flex algorithm
          re-solves the whole line every frame, its neighbours give up their width smoothly
          without a single tween of their own.
        */}
        {visible.length === 0 ? (
          <EmptyState
            icon={<NotePencilIcon size={32} aria-hidden />}
            title="Nothing matches"
            description="No published post matches those filters. Try a broader search."
            action={
              <ButtonLink href="/blog" variant="outline">
                Clear filters
              </ButtonLink>
            }
          />
        ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:flex lg:flex-col">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="contents lg:flex lg:gap-6">
              {row.map((post, columnIndex) => {
                const index = rowIndex * ROW_SIZE + columnIndex;

                return (
                  <Reveal
                    key={post.documentId}
                    delay={Math.min(columnIndex, 5) * 0.05}
                    className={cn(
                      // `basis-0` so the three cards start dead equal regardless of how
                      // much text each one holds, and `min-w-0` so a long title cannot
                      // set a floor that stops a card ever being squeezed.
                      'lg:min-w-0 lg:flex-1 lg:basis-0',
                      // Only `flex-grow` transitions. Animating `flex` wholesale would
                      // drag `flex-basis` along with it and fight the layout.
                      'lg:motion-safe:transition-[flex-grow] lg:motion-safe:duration-500',
                      // `ease-[…]`, not `[transition-timing-function:…]`. The raw property
                      // is emitted alongside the one `transition-[flex-grow]` writes for
                      // itself, at equal specificity — so which one wins comes down to
                      // rule order, and it was losing. The `ease-*` utility sets the
                      // variable `transition-*` reads, so it cannot be overridden by it.
                      'lg:ease-[var(--ease-settle)]',
                      // The expansion itself. Tailwind compiles `hover:` to
                      // `@media (hover: hover)`, so a touch screen never gets a card stuck
                      // open, and `motion-safe` keeps it out of reduced-motion entirely
                      // rather than snapping it open with no transition.
                      'lg:motion-safe:hover:flex-[2.4]'
                    )}
                  >
                    <PostCard post={post} priority={index < ROW_SIZE} fixedMedia />
                  </Reveal>
                );
              })}

              {/* A short last row must leave its cards at one third, not stretch them
                  across the line. The spacers only exist on the flex layout. */}
              {Array.from({ length: ROW_SIZE - row.length }).map((_, index) => (
                <div
                  key={`spacer-${index}`}
                  aria-hidden
                  className="hidden lg:block lg:flex-1 lg:basis-0"
                />
              ))}
            </div>
          ))}
        </div>
        )}
      </Container>
    </div>
  );
}
