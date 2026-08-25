import type { Core } from '@strapi/strapi';
import type { CourseSeed, PostSeed } from './types';
import { coverFor } from './types';
import { COURSES } from './courses';
import { POSTS } from './posts';

/**
 * Full catalog seed.
 *
 * Separate from `seedDemoData` and gated on its own flag, because the two answer different
 * questions. The demo seed is a fixture — it stops the moment any course exists, since a
 * fixture that half-applies to a live database is worse than none. This one is content,
 * and content has to be safe to add to a database that already has some.
 *
 * So the guard is per record rather than per run: a course whose slug is already taken is
 * skipped whole, and anything missing is created. Running it twice changes nothing; adding
 * an eleventh course to the data and running it again creates exactly that one. Nothing is
 * ever updated or deleted, so work done in the admin panel is never overwritten.
 */

const findCourseBySlug = (strapi: Core.Strapi, slug: string) =>
  strapi.db.query('api::course.course').findOne({ where: { slug } });

const findPostBySlug = (strapi: Core.Strapi, slug: string) =>
  strapi.db.query('api::blog-post.blog-post').findOne({ where: { slug } });

const createCourse = async (
  strapi: Core.Strapi,
  seed: CourseSeed,
  ownerId: string | number | undefined
) => {
  const course = await strapi.documents('api::course.course').create({
    data: {
      title: seed.title,
      slug: seed.slug,
      description: seed.description,
      coverImageUrl: coverFor(seed.slug),
      level: seed.level,
      isPublished: seed.isPublished,
      owner: ownerId,
    },
  });

  // `order` is what drives sequential unlocking on the student side, so it is derived from
  // array position rather than written out per lesson — the two could otherwise disagree.
  for (const [index, lesson] of seed.lessons.entries()) {
    await strapi.documents('api::lesson.lesson').create({
      data: {
        title: lesson.title,
        order: index + 1,
        contentType: lesson.contentType,
        body: lesson.body,
        videoUrl: lesson.videoUrl,
        course: course.id,
      },
    });
  }

  for (const quizSeed of seed.quizzes) {
    const quiz = await strapi.documents('api::quiz.quiz').create({
      data: {
        title: quizSeed.title,
        description: quizSeed.description,
        passingScore: quizSeed.passingScore,
        course: course.id,
      },
    });

    for (const [index, question] of quizSeed.questions.entries()) {
      await strapi.documents('api::question.question').create({
        data: {
          prompt: question.prompt,
          options: question.options,
          correctIndex: question.correctIndex,
          order: index + 1,
          quiz: quiz.id,
        },
      });
    }
  }

  return course;
};

const createPost = async (
  strapi: Core.Strapi,
  seed: PostSeed,
  authorId: string | number | undefined
) => {
  const post = await strapi.documents('api::blog-post.blog-post').create({
    data: {
      title: seed.title,
      slug: seed.slug,
      excerpt: seed.excerpt,
      body: seed.body,
      coverImageUrl: coverFor(seed.slug),
      author: authorId,
    },
  });

  // Blog posts are the one content type here using Strapi's Draft & Publish, so a created
  // record is a draft until this runs. Leaving a couple unpublished is deliberate: a
  // catalog where everything is live cannot demonstrate that drafts stay private.
  if (seed.publish) {
    await strapi.documents('api::blog-post.blog-post').publish({
      documentId: post.documentId,
    });
  }

  return post;
};

export const seedCatalog = async (strapi: Core.Strapi) => {
  const emails = new Set<string>([
    ...COURSES.map((course) => course.ownerEmail),
    ...POSTS.map((post) => post.authorEmail),
  ]);

  const usersByEmail = new Map<string, { id: string | number }>();

  for (const email of emails) {
    const user = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { email } });

    if (!user) {
      throw new Error(
        `Cannot seed the catalog: no user with email "${email}". Run with SEED_DEMO_DATA=true first.`
      );
    }

    usersByEmail.set(email, user);
  }

  let createdCourses = 0;
  let createdPosts = 0;

  for (const seed of COURSES) {
    if (await findCourseBySlug(strapi, seed.slug)) continue;

    await createCourse(strapi, seed, usersByEmail.get(seed.ownerEmail)?.id);
    createdCourses += 1;
  }

  for (const seed of POSTS) {
    if (await findPostBySlug(strapi, seed.slug)) continue;

    await createPost(strapi, seed, usersByEmail.get(seed.authorEmail)?.id);
    createdPosts += 1;
  }

  if (createdCourses === 0 && createdPosts === 0) {
    strapi.log.info('[lms] catalog already present — nothing to add');
    return;
  }

  const lessons = COURSES.reduce((total, course) => total + course.lessons.length, 0);
  const quizzes = COURSES.reduce((total, course) => total + course.quizzes.length, 0);

  strapi.log.info(
    `[lms] catalog seeded: ${createdCourses} courses (${lessons} lessons, ${quizzes} quizzes across the set), ${createdPosts} posts`
  );
};
