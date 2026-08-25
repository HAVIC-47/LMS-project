/**
 * Shapes for the full catalog seed.
 *
 * Separate from the types in `../seed.ts` on purpose. That seed is a fixture: five short
 * courses chosen to exercise awkward permission cases. This one is a catalog — ten courses
 * of fifteen lessons and five quizzes each — and it carries a different shape because a
 * course here has many quizzes rather than an optional one.
 */

export type LessonSeed = {
  title: string;
  contentType: 'text' | 'video';
  body?: string;
  videoUrl?: string;
};

export type QuestionSeed = {
  prompt: string;
  options: string[];
  /** Index into `options`. Never leaves the server for a student — see the quiz sanitizer. */
  correctIndex: number;
};

export type QuizSeed = {
  title: string;
  description: string;
  passingScore: number;
  questions: QuestionSeed[];
};

export type CourseSeed = {
  title: string;
  slug: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  isPublished: boolean;
  /** Must match a seeded user, so ownership — and therefore "own courses only" — is real. */
  ownerEmail: string;
  lessons: LessonSeed[];
  quizzes: QuizSeed[];
};

export type PostSeed = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  authorEmail: string;
  /** Drafts stay invisible to the public list. A catalog with none would not prove that. */
  publish: boolean;
};

/**
 * Covers come from Picsum rather than Unsplash.
 *
 * Unsplash photo IDs have to be looked up one by one and a wrong guess 404s, which shows
 * up as ten fallback tiles in a catalog that is supposed to look finished. A seeded Picsum
 * URL is deterministic — the same slug always returns the same photograph — so the catalog
 * looks identical on every machine and every rebuild, and it can never 404.
 *
 * Both `picsum.photos` and the `fastly.picsum.photos` host it redirects to are already in
 * the frontend's `remotePatterns`.
 */
export const coverFor = (slug: string) => `https://picsum.photos/seed/kiln-${slug}/1200/750`;
