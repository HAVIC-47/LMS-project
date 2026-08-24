import type { Core } from '@strapi/strapi';
import { ROLES, type RoleType } from '../utils/permissions';

/**
 * Demo data, so the app has something to show the moment it boots.
 *
 * Guarded by `SEED_DEMO_DATA=true` and skipped entirely once any course exists, which
 * makes restarting safe — the seed never duplicates itself and never overwrites work.
 *
 * The dataset is chosen to exercise the awkward cases, not just the happy path:
 *   - a course owned by the instructor and a course owned by the content manager, so
 *     "own only" vs "any course" is actually testable
 *   - an unpublished course, to prove students cannot see or enroll in it
 *   - a course with no quiz, so the quiz UI has to cope with nothing to take
 *   - a student who is partway through a course, so the percentage is not 0 or 100
 *   - one published blog post and one draft
 */

const USER_UID = 'plugin::users-permissions.user';
const ROLE_UID = 'plugin::users-permissions.role';

type SeedUser = { username: string; email: string; role: RoleType };

const SEED_USERS: SeedUser[] = [
  { username: 'admin', email: 'admin@lms.test', role: ROLES.ADMIN },
  { username: 'contentmanager', email: 'cm@lms.test', role: ROLES.CONTENT_MANAGER },
  { username: 'instructor', email: 'instructor@lms.test', role: ROLES.INSTRUCTOR },
  { username: 'student', email: 'student@lms.test', role: ROLES.STUDENT },
  { username: 'student2', email: 'student2@lms.test', role: ROLES.STUDENT },
];

const ensureUser = async (strapi: Core.Strapi, seed: SeedUser, password: string) => {
  const existing = await strapi.db.query(USER_UID).findOne({ where: { email: seed.email } });

  if (existing) return existing;

  const role = await strapi.db.query(ROLE_UID).findOne({ where: { type: seed.role } });

  if (!role) {
    throw new Error(`Cannot seed ${seed.email}: role "${seed.role}" is missing`);
  }

  // Going through the plugin's own user service means the password is hashed exactly the
  // way the login endpoint expects to verify it.
  return strapi.plugin('users-permissions').service('user').add({
    username: seed.username,
    email: seed.email,
    password,
    provider: 'local',
    confirmed: true,
    blocked: false,
    role: role.id,
  });
};

type LessonSeed = { title: string; contentType: 'text' | 'video'; body?: string; videoUrl?: string };

type CourseSeed = {
  title: string;
  slug: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  coverImageUrl: string;
  isPublished: boolean;
  ownerEmail: string;
  lessons: LessonSeed[];
  quiz?: {
    title: string;
    description: string;
    passingScore: number;
    questions: { prompt: string; options: string[]; correctIndex: number }[];
  };
};

const COURSES: CourseSeed[] = [
  {
    title: 'Modern JavaScript Foundations',
    slug: 'modern-javascript-foundations',
    level: 'beginner',
    description:
      'Scope, closures, the event loop and the async model — the parts of JavaScript that explain why the rest of it behaves the way it does.',
    coverImageUrl: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=1200&q=80',
    isPublished: true,
    ownerEmail: 'instructor@lms.test',
    lessons: [
      {
        title: 'Values, bindings and scope',
        contentType: 'text',
        body: 'A binding is a name pointing at a value. `let` and `const` are block scoped; `var` is function scoped, which is the source of most surprises in older code.',
      },
      {
        title: 'Closures in practice',
        contentType: 'text',
        body: 'A closure is a function plus the scope it was created in. It is how a callback still knows about a variable that has long since gone out of view.',
      },
      {
        title: 'The event loop, visually',
        contentType: 'video',
        videoUrl: 'https://www.youtube.com/watch?v=8aGhZQkoFbQ',
      },
      {
        title: 'Promises and async/await',
        contentType: 'text',
        body: 'A promise is a value that is not there yet. `await` does not make code synchronous — it suspends the surrounding function and lets the loop carry on.',
      },
      {
        title: 'Modules and bundling',
        contentType: 'text',
        body: 'ES modules are statically analysable, which is what makes tree shaking possible. CommonJS is resolved at runtime, which is what makes it not.',
      },
    ],
    quiz: {
      title: 'JavaScript Foundations Check',
      description: 'Five questions on scope, closures and the async model.',
      passingScore: 60,
      questions: [
        {
          prompt: 'Which declaration is scoped to the nearest enclosing block?',
          options: ['var', 'let', 'function', 'None of them'],
          correctIndex: 1,
        },
        {
          prompt: 'A closure captures…',
          options: [
            'A copy of the values at creation time',
            'The scope it was created in',
            'Only the global object',
            'Nothing — it is just a function',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'What does the event loop do when the call stack is empty?',
          options: [
            'Stops the program',
            'Runs the next queued task',
            'Garbage collects immediately',
            'Blocks until a timer fires',
          ],
          correctIndex: 1,
        },
        {
          prompt: '`await` inside an async function…',
          options: [
            'Blocks the whole thread',
            'Suspends that function and returns control to the loop',
            'Converts the promise to a synchronous value',
            'Has no effect outside a try/catch',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Tree shaking relies on which module format being statically analysable?',
          options: ['CommonJS', 'AMD', 'ES modules', 'UMD'],
          correctIndex: 2,
        },
      ],
    },
  },
  {
    title: 'Designing for the Web',
    slug: 'designing-for-the-web',
    level: 'intermediate',
    description:
      'Type, spacing, colour and hierarchy — how to make an interface feel considered rather than assembled.',
    coverImageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&q=80',
    isPublished: true,
    ownerEmail: 'cm@lms.test',
    lessons: [
      {
        title: 'A type scale you can defend',
        contentType: 'text',
        body: 'Pick a ratio, generate the steps, and use only those. Arbitrary font sizes are how a design starts to look accidental.',
      },
      {
        title: 'Spacing as rhythm',
        contentType: 'text',
        body: 'Whitespace is not leftover room. Consistent spacing steps are what make a page feel calm at a glance, before anything is read.',
      },
      {
        title: 'Colour with intent',
        contentType: 'video',
        videoUrl: 'https://www.youtube.com/watch?v=_2LLXnUdUIc',
      },
      {
        title: 'Hierarchy and the second read',
        contentType: 'text',
        body: 'The first read is scanned, the second is actually read. Design the scan first: what should someone remember after two seconds?',
      },
    ],
    quiz: {
      title: 'Design Fundamentals Check',
      description: 'Four questions on type, spacing and hierarchy.',
      passingScore: 50,
      questions: [
        {
          prompt: 'A type scale is best described as…',
          options: [
            'Any set of font sizes',
            'A fixed set of sizes derived from a ratio',
            'The number of typefaces on a page',
            'The line height of body text',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Consistent spacing steps primarily improve…',
          options: ['Load time', 'Perceived order', 'Colour contrast', 'Accessibility scores only'],
          correctIndex: 1,
        },
        {
          prompt: 'Visual hierarchy is mainly about…',
          options: [
            'Making everything the same size',
            'Controlling what gets noticed first',
            'Using more colours',
            'Reducing the number of sections',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Whitespace on a page should be treated as…',
          options: [
            'Wasted room to fill',
            'An active part of the composition',
            'Only a mobile concern',
            'A last resort',
          ],
          correctIndex: 1,
        },
      ],
    },
  },
  {
    title: 'Data Structures in Practice',
    slug: 'data-structures-in-practice',
    level: 'intermediate',
    description:
      'Choosing the right structure for the access pattern you actually have, rather than the one you memorised for an interview.',
    coverImageUrl: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=1200&q=80',
    isPublished: true,
    ownerEmail: 'instructor@lms.test',
    // Deliberately quiz-less: the student UI has to handle a course with nothing to take.
    lessons: [
      {
        title: 'Arrays and locality',
        contentType: 'text',
        body: 'Contiguous memory is why an array scan beats a linked list even when the Big-O says otherwise.',
      },
      {
        title: 'Hash maps and collisions',
        contentType: 'text',
        body: 'Average O(1) hides a worst case. What matters in practice is the hash function and the load factor.',
      },
      {
        title: 'Trees and ordered access',
        contentType: 'text',
        body: 'Reach for a tree when you need order *and* lookups. If you only need lookups, a hash map is almost always the better trade.',
      },
      {
        title: 'Queues, stacks and the shape of a problem',
        contentType: 'text',
        body: 'Breadth-first wants a queue, depth-first wants a stack. Getting this backwards is the most common traversal bug.',
      },
      {
        title: 'Choosing under real constraints',
        contentType: 'text',
        body: 'Measure the access pattern before optimising the structure. The profile is usually more surprising than the theory.',
      },
    ],
  },
  {
    title: 'Advanced TypeScript Patterns',
    slug: 'advanced-typescript-patterns',
    level: 'advanced',
    description: 'Conditional types, inference and the parts of the type system that fight back. Still being written.',
    coverImageUrl: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=1200&q=80',
    // Unpublished on purpose: students must not see it in the catalog or be able to enroll.
    isPublished: false,
    ownerEmail: 'instructor@lms.test',
    lessons: [
      {
        title: 'Conditional types',
        contentType: 'text',
        body: 'Draft.',
      },
    ],
  },
];

export const seedDemoData = async (strapi: Core.Strapi) => {
  const password = process.env.SEED_PASSWORD || 'Passw0rd!23';

  const users = new Map<string, { id: number; email: string }>();

  for (const seedUser of SEED_USERS) {
    const user = await ensureUser(strapi, seedUser, password);
    users.set(seedUser.email, user);
  }

  const existingCourses = await strapi.db.query('api::course.course').count({});

  if (existingCourses > 0) {
    strapi.log.info('[lms] demo courses already present — skipping content seed');
    return;
  }

  // The Document Service types `id` as `string | number`, so these maps use the same
  // widened type rather than asserting it down to a number.
  type CreatedEntry = { id: string | number; documentId: string };

  const createdCourses = new Map<string, CreatedEntry>();
  const lessonsByCourse = new Map<string, CreatedEntry[]>();
  const quizzesByCourse = new Map<string, CreatedEntry>();

  for (const courseSeed of COURSES) {
    const owner = users.get(courseSeed.ownerEmail);

    const course = await strapi.documents('api::course.course').create({
      data: {
        title: courseSeed.title,
        slug: courseSeed.slug,
        description: courseSeed.description,
        coverImageUrl: courseSeed.coverImageUrl,
        level: courseSeed.level,
        isPublished: courseSeed.isPublished,
        owner: owner?.id,
      },
    });

    createdCourses.set(courseSeed.slug, course);

    const lessons: CreatedEntry[] = [];

    for (const [index, lessonSeed] of courseSeed.lessons.entries()) {
      const lesson = await strapi.documents('api::lesson.lesson').create({
        data: {
          title: lessonSeed.title,
          order: index + 1,
          contentType: lessonSeed.contentType,
          body: lessonSeed.body,
          videoUrl: lessonSeed.videoUrl,
          course: course.id,
        },
      });

      lessons.push(lesson);
    }

    lessonsByCourse.set(courseSeed.slug, lessons);

    if (courseSeed.quiz) {
      const quiz = await strapi.documents('api::quiz.quiz').create({
        data: {
          title: courseSeed.quiz.title,
          description: courseSeed.quiz.description,
          passingScore: courseSeed.quiz.passingScore,
          course: course.id,
        },
      });

      quizzesByCourse.set(courseSeed.slug, quiz);

      for (const [index, questionSeed] of courseSeed.quiz.questions.entries()) {
        await strapi.documents('api::question.question').create({
          data: {
            prompt: questionSeed.prompt,
            options: questionSeed.options,
            correctIndex: questionSeed.correctIndex,
            order: index + 1,
            quiz: quiz.id,
          },
        });
      }
    }
  }

  // The demo student is enrolled in two courses and partway through the first, so the
  // progress bar shows a real fraction (2 of 5 = 40%) instead of an empty or full bar.
  const student = users.get('student@lms.test');
  const jsCourse = createdCourses.get('modern-javascript-foundations');
  const designCourse = createdCourses.get('designing-for-the-web');

  if (student && jsCourse && designCourse) {
    for (const course of [jsCourse, designCourse]) {
      await strapi.documents('api::enrollment.enrollment').create({
        data: {
          student: student.id,
          course: course.id,
          enrolledAt: new Date().toISOString(),
        },
      });
    }

    const jsLessons = lessonsByCourse.get('modern-javascript-foundations') ?? [];

    for (const lesson of jsLessons.slice(0, 2)) {
      await strapi.documents('api::lesson-progress.lesson-progress').create({
        data: {
          student: student.id,
          lesson: lesson.id,
          course: jsCourse.id,
          completed: true,
          completedAt: new Date().toISOString(),
        },
      });
    }
  }

  const contentManager = users.get('cm@lms.test');

  const publishedPost = await strapi.documents('api::blog-post.blog-post').create({
    data: {
      title: 'What we look for in a first engineering hire',
      slug: 'what-we-look-for-in-a-first-engineering-hire',
      excerpt: 'Not the number of frameworks. The ability to explain a decision.',
      body: 'The strongest early-career engineers we work with have one habit in common: they can say why they built something the way they did, and what they would change. Tooling is learnable. That habit is harder to teach.',
      coverImageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80',
      author: contentManager?.id,
    },
  });

  await strapi.documents('api::blog-post.blog-post').publish({
    documentId: publishedPost.documentId,
  });

  // Left as a draft on purpose — it must not appear in the public blog list.
  await strapi.documents('api::blog-post.blog-post').create({
    data: {
      title: 'Course roadmap for next quarter (draft)',
      slug: 'course-roadmap-next-quarter',
      excerpt: 'Internal planning notes — not for publication yet.',
      body: 'Draft outline of the courses we intend to record next quarter. Do not publish until the schedule is confirmed.',
      author: contentManager?.id,
    },
  });

  strapi.log.info('[lms] demo data seeded');
};
