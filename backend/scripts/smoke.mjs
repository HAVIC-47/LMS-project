#!/usr/bin/env node
/**
 * Backend smoke test — walks the permission matrix from the project spec end to end.
 *
 *   node scripts/smoke.mjs [baseUrl]
 *
 * Plain Node, no dependencies, no test runner. It logs in as each role against the
 * running server and asserts the *status code* of every interesting call: 200/201 where
 * the matrix says yes, 403 where it says no, plus the content checks that matter
 * (the answer key never reaching a student, drafts never reaching the public, the
 * progress percentage being right).
 *
 * The point is that "role-based access control works" stops being a claim and becomes
 * something you can re-run in five seconds after any change.
 *
 * Requires the server to be running with SEED_DEMO_DATA=true.
 */

// 127.0.0.1 rather than localhost: on Windows, Node resolves `localhost` to ::1 first,
// while Strapi's default HOST=0.0.0.0 only listens on IPv4 — so `localhost` fails to connect.
const BASE = (process.argv[2] || process.env.STRAPI_URL || 'http://127.0.0.1:1337').replace(/\/$/, '');
const SEED_PASSWORD = process.env.SEED_PASSWORD || 'Passw0rd!23';

const results = [];
let failures = 0;

const color = {
  green: (s) => `[32m${s}[0m`,
  red: (s) => `[31m${s}[0m`,
  dim: (s) => `[2m${s}[0m`,
  bold: (s) => `[1m${s}[0m`,
};

function record(group, name, passed, detail = '') {
  results.push({ group, name, passed, detail });
  if (!passed) failures += 1;
  const mark = passed ? color.green('PASS') : color.red('FAIL');
  console.log(`  ${mark}  ${name}${detail ? color.dim(`  — ${detail}`) : ''}`);
}

async function call(token, method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let json = null;
  try {
    json = await response.json();
  } catch {
    /* empty body — fine for 204s */
  }

  return { status: response.status, json };
}

/** Asserts an HTTP status. `expected` may be a number or a list of acceptable numbers. */
async function expectStatus(group, name, token, method, path, expected, body) {
  const accept = Array.isArray(expected) ? expected : [expected];
  const { status, json } = await call(token, method, path, body);
  const passed = accept.includes(status);

  record(
    group,
    name,
    passed,
    passed ? `${status}` : `expected ${accept.join('|')}, got ${status} ${JSON.stringify(json?.error?.message ?? '')}`
  );

  return json;
}

function expectTrue(group, name, condition, detail = '') {
  record(group, name, Boolean(condition), detail);
}

async function login(email) {
  const { status, json } = await call(null, 'POST', '/api/auth/local', {
    identifier: email,
    password: SEED_PASSWORD,
  });

  if (status !== 200 || !json?.jwt) {
    throw new Error(
      `Could not log in as ${email} (status ${status}). Is the server running with SEED_DEMO_DATA=true and SEED_PASSWORD matching?`
    );
  }

  return { jwt: json.jwt, user: json.user };
}

function heading(title) {
  console.log(`\n${color.bold(title)}`);
}

async function main() {
  console.log(color.bold(`\nLMS backend smoke test  →  ${BASE}\n`));

  // ---------------------------------------------------------------------------
  // Sign in as each seeded role.
  // ---------------------------------------------------------------------------
  const admin = await login('admin@lms.test');
  const cm = await login('cm@lms.test');
  const instructor = await login('instructor@lms.test');
  const seededStudent = await login('student@lms.test');

  // A fresh sign-up each run, so the student-side write tests start from a known state
  // and re-running the script never depends on what a previous run left behind.
  const stamp = Date.now();
  const newStudentEmail = `smoke.${stamp}@lms.test`;

  heading('Registration');

  const registration = await call(null, 'POST', '/api/auth/local/register', {
    username: `smoke_${stamp}`,
    email: newStudentEmail,
    password: SEED_PASSWORD,
  });

  expectTrue(
    'auth',
    'anyone can sign up',
    registration.status === 200 && Boolean(registration.json?.jwt),
    `status ${registration.status}`
  );

  const student = { jwt: registration.json.jwt, user: registration.json.user };

  const me = await call(student.jwt, 'GET', '/api/users/me?populate=role');
  expectTrue(
    'auth',
    'a new sign-up is a student, not an admin',
    me.json?.role?.type === 'student',
    `role = ${me.json?.role?.type}`
  );

  // Privilege escalation attempt: ask to be created as an admin.
  const escalation = await call(null, 'POST', '/api/auth/local/register', {
    username: `escalate_${stamp}`,
    email: `escalate.${stamp}@lms.test`,
    password: SEED_PASSWORD,
    role: 1,
  });

  if (escalation.status === 200) {
    const escalated = await call(escalation.json.jwt, 'GET', '/api/users/me?populate=role');
    expectTrue(
      'auth',
      'a `role` in the sign-up body is ignored',
      escalated.json?.role?.type === 'student',
      `role = ${escalated.json?.role?.type}`
    );
  } else {
    record('auth', 'a `role` in the sign-up body is ignored', true, `rejected with ${escalation.status}`);
  }

  // ---------------------------------------------------------------------------
  // Reference data.
  // ---------------------------------------------------------------------------
  const catalog = await call(null, 'GET', '/api/courses?pagination[pageSize]=100');
  const publicCourses = catalog.json?.data ?? [];

  const jsCourse = publicCourses.find((c) => c.slug === 'modern-javascript-foundations');
  const designCourse = publicCourses.find((c) => c.slug === 'designing-for-the-web');
  const dataCourse = publicCourses.find((c) => c.slug === 'data-structures-in-practice');

  const adminCatalog = await call(admin.jwt, 'GET', '/api/courses?pagination[pageSize]=100');
  const draftCourse = (adminCatalog.json?.data ?? []).find(
    (c) => c.slug === 'advanced-typescript-patterns'
  );

  if (!jsCourse || !designCourse || !dataCourse || !draftCourse) {
    throw new Error('Seed data missing — start the server once with SEED_DEMO_DATA=true');
  }

  // ---------------------------------------------------------------------------
  heading('Public (logged out)');
  // ---------------------------------------------------------------------------
  await expectStatus('public', 'can browse the course catalog', null, 'GET', '/api/courses', 200);

  expectTrue(
    'public',
    'unpublished courses are absent from the catalog',
    !publicCourses.some((c) => c.slug === 'advanced-typescript-patterns'),
    `${publicCourses.length} courses visible`
  );

  await expectStatus(
    'public',
    'an unpublished course 404s by documentId',
    null,
    'GET',
    `/api/courses/${draftCourse.documentId}`,
    404
  );

  const publicBlog = await call(null, 'GET', '/api/blog-posts');
  expectTrue(
    'public',
    'only published blog posts are listed',
    (publicBlog.json?.data ?? []).every((p) => !p.slug.includes('roadmap')),
    `${publicBlog.json?.data?.length ?? 0} posts`
  );

  const draftProbe = await call(null, 'GET', '/api/blog-posts?status=draft');
  expectTrue(
    'public',
    '`?status=draft` does not leak drafts to the public',
    (draftProbe.json?.data ?? []).every((p) => !p.slug.includes('roadmap')),
    `${draftProbe.json?.data?.length ?? 0} posts returned`
  );

  await expectStatus('public', 'cannot list lessons', null, 'GET', '/api/lessons', 403);
  await expectStatus('public', 'cannot list quizzes', null, 'GET', '/api/quizzes', 403);
  await expectStatus('public', 'cannot create a course', null, 'POST', '/api/courses', 403, {
    data: { title: 'Nope', slug: `nope-${stamp}`, level: 'beginner' },
  });
  await expectStatus('public', 'cannot reach the admin panel API', null, 'GET', '/api/platform/stats', 403);

  // ---------------------------------------------------------------------------
  heading('Student');
  // ---------------------------------------------------------------------------
  await expectStatus('student', 'cannot create a course', student.jwt, 'POST', '/api/courses', 403, {
    data: { title: 'Student course', slug: `student-course-${stamp}`, level: 'beginner' },
  });
  await expectStatus(
    'student',
    'cannot edit a course',
    student.jwt,
    'PUT',
    `/api/courses/${jsCourse.documentId}`,
    403,
    { data: { title: 'Hijacked' } }
  );
  await expectStatus(
    'student',
    'cannot delete a course',
    student.jwt,
    'DELETE',
    `/api/courses/${jsCourse.documentId}`,
    403
  );
  await expectStatus('student', 'cannot add a lesson', student.jwt, 'POST', '/api/lessons', 403, {
    data: { title: 'Nope', order: 1, contentType: 'text', course: jsCourse.documentId },
  });
  await expectStatus('student', 'cannot read quizzes with answers', student.jwt, 'GET', '/api/quizzes', 403);
  await expectStatus('student', 'cannot write a blog post', student.jwt, 'POST', '/api/blog-posts', 403, {
    data: { title: 'Nope', slug: `nope-post-${stamp}` },
  });
  await expectStatus('student', 'cannot open the admin panel API', student.jwt, 'GET', '/api/platform/stats', 403);
  await expectStatus('student', 'cannot list users', student.jwt, 'GET', '/api/platform/users', 403);
  await expectStatus(
    'student',
    'cannot change anyone’s role',
    student.jwt,
    'PUT',
    `/api/platform/users/${student.user.id}/role`,
    403,
    { role: 'admin' }
  );
  await expectStatus(
    'student',
    'cannot view another student’s progress report',
    student.jwt,
    'GET',
    `/api/courses/${jsCourse.documentId}/students-progress`,
    403
  );

  // --- enrollment -------------------------------------------------------------
  await expectStatus(
    'student',
    'cannot enroll in an unpublished course',
    student.jwt,
    'POST',
    '/api/enrollments/enroll',
    404,
    { courseId: draftCourse.documentId }
  );

  await expectStatus('student', 'can enroll in a published course', student.jwt, 'POST', '/api/enrollments/enroll', 201, {
    courseId: jsCourse.documentId,
  });

  await expectStatus(
    'student',
    'enrolling twice is rejected with 409',
    student.jwt,
    'POST',
    '/api/enrollments/enroll',
    409,
    { courseId: jsCourse.documentId }
  );

  const myCourses = await call(student.jwt, 'GET', '/api/enrollments/me');
  expectTrue(
    'student',
    '"My Courses" lists the enrollment with progress',
    (myCourses.json?.data ?? []).some(
      (e) => e.course.documentId === jsCourse.documentId && e.progress.total === 5 && e.progress.percentage === 0
    ),
    JSON.stringify((myCourses.json?.data ?? []).map((e) => `${e.course.slug}:${e.progress.percentage}%`))
  );

  // --- lesson access ----------------------------------------------------------
  const courseDetail = await call(student.jwt, 'GET', `/api/courses/${jsCourse.documentId}?populate=lessons`);
  const lessons = (courseDetail.json?.data?.lessons ?? []).slice().sort((a, b) => a.order - b.order);

  expectTrue('student', 'course detail lists lessons in order', lessons.length === 5, `${lessons.length} lessons`);
  expectTrue(
    'student',
    'course detail does not leak lesson bodies',
    lessons.every((l) => l.body === undefined && l.videoUrl === undefined),
    'no body/videoUrl on the course payload'
  );

  const firstLesson = await call(student.jwt, 'GET', `/api/lessons/${lessons[0].documentId}`);
  expectTrue(
    'student',
    'an enrolled student can read a lesson body',
    firstLesson.status === 200 && Boolean(firstLesson.json?.data?.body),
    `status ${firstLesson.status}`
  );

  const designDetail = await call(admin.jwt, `GET`, `/api/courses/${designCourse.documentId}?populate=lessons`);
  const foreignLesson = (designDetail.json?.data?.lessons ?? [])[0];

  await expectStatus(
    'student',
    'cannot read a lesson of a course they are not enrolled in',
    student.jwt,
    'GET',
    `/api/lessons/${foreignLesson.documentId}`,
    403
  );

  // --- progress tracking ------------------------------------------------------
  const afterOne = await call(student.jwt, 'POST', '/api/lesson-progresses/complete', {
    lessonId: lessons[0].documentId,
  });
  expectTrue(
    'progress',
    'marking one of five lessons complete gives 20%',
    afterOne.json?.data?.progress?.percentage === 20,
    `got ${afterOne.json?.data?.progress?.percentage}%`
  );

  const repeat = await call(student.jwt, 'POST', '/api/lesson-progresses/complete', {
    lessonId: lessons[0].documentId,
  });
  expectTrue(
    'progress',
    'marking the same lesson twice is idempotent',
    repeat.json?.data?.progress?.percentage === 20,
    `still ${repeat.json?.data?.progress?.percentage}%`
  );

  await call(student.jwt, 'POST', '/api/lesson-progresses/complete', { lessonId: lessons[1].documentId });
  const afterThree = await call(student.jwt, 'POST', '/api/lesson-progresses/complete', {
    lessonId: lessons[2].documentId,
  });
  expectTrue(
    'progress',
    'three of five lessons gives 60%',
    afterThree.json?.data?.progress?.percentage === 60,
    `got ${afterThree.json?.data?.progress?.percentage}%`
  );

  const persisted = await call(student.jwt, 'GET', `/api/courses/${jsCourse.documentId}/my-progress`);
  expectTrue(
    'progress',
    'progress persists on a fresh request',
    persisted.json?.data?.percentage === 60 && persisted.json?.data?.completed === 3,
    `${persisted.json?.data?.completed}/${persisted.json?.data?.total}`
  );

  const undone = await call(student.jwt, 'POST', '/api/lesson-progresses/uncomplete', {
    lessonId: lessons[2].documentId,
  });
  expectTrue(
    'progress',
    'un-completing a lesson drops it back to 40%',
    undone.json?.data?.progress?.percentage === 40,
    `got ${undone.json?.data?.progress?.percentage}%`
  );

  await expectStatus(
    'progress',
    'cannot mark progress on a course they are not enrolled in',
    student.jwt,
    'POST',
    '/api/lesson-progresses/complete',
    403,
    { lessonId: foreignLesson.documentId }
  );

  // --- quiz -------------------------------------------------------------------
  const adminQuizzes = await call(admin.jwt, 'GET', '/api/quizzes?populate=course');
  const jsQuiz = (adminQuizzes.json?.data ?? []).find((q) => q.course?.slug === 'modern-javascript-foundations');

  const answerKey = await call(admin.jwt, `GET`, `/api/quizzes/${jsQuiz.documentId}?populate=questions`);
  const keyedQuestions = (answerKey.json?.data?.questions ?? [])
    .slice()
    .sort((a, b) => a.order - b.order);

  const studentQuiz = await call(student.jwt, 'GET', `/api/quizzes/${jsQuiz.documentId}/take`);
  expectTrue(
    'quiz',
    'an enrolled student can open the quiz',
    studentQuiz.status === 200 && (studentQuiz.json?.data?.questions ?? []).length === 5,
    `status ${studentQuiz.status}`
  );
  expectTrue(
    'quiz',
    'the answer key is stripped from the student payload',
    !JSON.stringify(studentQuiz.json).includes('correctIndex'),
    'no `correctIndex` anywhere in the response'
  );

  await expectStatus(
    'quiz',
    'a student cannot read the quiz through the core endpoint',
    student.jwt,
    'GET',
    `/api/quizzes/${jsQuiz.documentId}`,
    403
  );

  // Answer the first three correctly and the last two wrongly → 3/5 = 60%.
  const answers = keyedQuestions.map((question, index) => ({
    questionId: question.documentId,
    selectedIndex:
      index < 3 ? question.correctIndex : (question.correctIndex + 1) % question.options.length,
  }));

  const graded = await call(student.jwt, 'POST', `/api/quizzes/${jsQuiz.documentId}/submit`, { answers });
  expectTrue(
    'quiz',
    'auto-grading scores 3 of 5 as 60%',
    graded.json?.data?.score === 60 && graded.json?.data?.correctCount === 3,
    `score ${graded.json?.data?.score}, correct ${graded.json?.data?.correctCount}`
  );
  expectTrue(
    'quiz',
    'passing is decided against the quiz threshold',
    graded.json?.data?.passed === true,
    `passed=${graded.json?.data?.passed} at passingScore 60`
  );

  const partial = await call(student.jwt, 'POST', `/api/quizzes/${jsQuiz.documentId}/submit`, {
    answers: [{ questionId: keyedQuestions[0].documentId, selectedIndex: keyedQuestions[0].correctIndex }],
  });
  expectTrue(
    'quiz',
    'unanswered questions count as wrong rather than erroring',
    partial.json?.data?.score === 20 && partial.json?.data?.totalQuestions === 5,
    `score ${partial.json?.data?.score}`
  );

  const outOfRange = await call(student.jwt, 'POST', `/api/quizzes/${jsQuiz.documentId}/submit`, {
    answers: keyedQuestions.map((q) => ({ questionId: q.documentId, selectedIndex: 99 })),
  });
  expectTrue(
    'quiz',
    'an out-of-range answer index is handled, not crashed on',
    outOfRange.status === 200 && outOfRange.json?.data?.score === 0,
    `status ${outOfRange.status}, score ${outOfRange.json?.data?.score}`
  );

  const history = await call(student.jwt, 'GET', '/api/quiz-attempts/me');
  expectTrue(
    'quiz',
    'attempts are stored and viewable later',
    (history.json?.data ?? []).length >= 3,
    `${history.json?.data?.length ?? 0} attempts`
  );

  await expectStatus(
    'quiz',
    'a student cannot take a quiz of a course they are not enrolled in',
    student.jwt,
    'GET',
    `/api/quizzes/${
      (adminQuizzes.json?.data ?? []).find((q) => q.course?.slug === 'designing-for-the-web').documentId
    }/take`,
    403
  );

  // ---------------------------------------------------------------------------
  heading('Instructor');
  // ---------------------------------------------------------------------------
  const created = await call(instructor.jwt, 'POST', '/api/courses', {
    data: {
      title: `Smoke Course ${stamp}`,
      slug: `smoke-course-${stamp}`,
      level: 'beginner',
      description: 'Created by the smoke test.',
      // Deliberately trying to assign the course to somebody else.
      owner: admin.user.id,
    },
  });

  expectTrue(
    'instructor',
    'can create a course',
    created.status === 200 || created.status === 201,
    `status ${created.status}`
  );

  const createdCourse = created.json?.data;

  const ownership = await call(admin.jwt, 'GET', `/api/courses/${createdCourse.documentId}`);
  expectTrue(
    'instructor',
    'ownership is forced to the caller, not the `owner` in the body',
    ownership.json?.data?.instructor?.id === instructor.user.id,
    `instructor = ${ownership.json?.data?.instructor?.username}`
  );

  await expectStatus(
    'instructor',
    'can edit their own course',
    instructor.jwt,
    'PUT',
    `/api/courses/${createdCourse.documentId}`,
    200,
    { data: { description: 'Edited by its owner.' } }
  );

  await expectStatus(
    'instructor',
    'cannot edit a course owned by someone else',
    instructor.jwt,
    'PUT',
    `/api/courses/${designCourse.documentId}`,
    403,
    { data: { title: 'Hijacked' } }
  );

  await expectStatus(
    'instructor',
    'cannot delete a course owned by someone else',
    instructor.jwt,
    'DELETE',
    `/api/courses/${designCourse.documentId}`,
    403
  );

  await expectStatus(
    'instructor',
    'can add a lesson to their own course',
    instructor.jwt,
    'POST',
    '/api/lessons',
    [200, 201],
    {
      data: {
        title: 'Smoke lesson',
        order: 1,
        contentType: 'text',
        body: 'Added by the smoke test.',
        course: createdCourse.documentId,
      },
    }
  );

  await expectStatus(
    'instructor',
    'cannot add a lesson to someone else’s course',
    instructor.jwt,
    'POST',
    '/api/lessons',
    403,
    {
      data: {
        title: 'Intrusion',
        order: 99,
        contentType: 'text',
        course: designCourse.documentId,
      },
    }
  );

  await expectStatus(
    'instructor',
    'can see progress for their own course',
    instructor.jwt,
    'GET',
    `/api/courses/${jsCourse.documentId}/students-progress`,
    200
  );

  await expectStatus(
    'instructor',
    'cannot see progress for someone else’s course',
    instructor.jwt,
    'GET',
    `/api/courses/${designCourse.documentId}/students-progress`,
    403
  );

  /**
   * Listing their own content.
   *
   * Regression guard. The instructor scoping filter originally walked `course.owner.id`,
   * which the content-API query validator rejects outright because no role can read the
   * user collection. The result was a 400 on every one of these routes: an instructor
   * could create and edit lessons but could not list them. Asserting the status alone is
   * not enough, so the counts are compared as well.
   */
  const instructorLessons = await call(instructor.jwt, 'GET', '/api/lessons?pagination[pageSize]=100');
  const managerLessons = await call(cm.jwt, 'GET', '/api/lessons?pagination[pageSize]=100');

  expectTrue(
    'instructor',
    'can list lessons',
    instructorLessons.status === 200,
    `status ${instructorLessons.status}`
  );

  expectTrue(
    'instructor',
    'lesson list is scoped to their own courses',
    (instructorLessons.json?.data?.length ?? 0) > 0 &&
      (instructorLessons.json?.data?.length ?? 0) < (managerLessons.json?.data?.length ?? 0),
    `instructor ${instructorLessons.json?.data?.length}, content manager ${managerLessons.json?.data?.length}`
  );

  /**
   * Regression guard. The scoping filter was merged with `{ ...clientFilters, course: scope }`,
   * which deletes the caller's own `course` condition because both are keyed on `course`.
   * The symptom was a request for one course's quiz returning a different course's quiz.
   */
  const scopedLessons = await call(
    instructor.jwt,
    'GET',
    `/api/lessons?filters[course][documentId][$eq]=${jsCourse.documentId}`
  );

  expectTrue(
    'instructor',
    'a course filter is respected, not replaced by the ownership scope',
    (scopedLessons.json?.data ?? []).length > 0 &&
      (scopedLessons.json?.data ?? []).length < (instructorLessons.json?.data?.length ?? 0),
    `${scopedLessons.json?.data?.length} for the course vs ${instructorLessons.json?.data?.length} in total`
  );

  const foreignLessons = await call(
    instructor.jwt,
    'GET',
    `/api/lessons?filters[course][documentId][$eq]=${designCourse.documentId}`
  );

  expectTrue(
    'instructor',
    'filtering by another owner’s course returns nothing',
    (foreignLessons.json?.data ?? []).length === 0,
    `${foreignLessons.json?.data?.length} rows`
  );

  await expectStatus('instructor', 'can list quizzes', instructor.jwt, 'GET', '/api/quizzes?populate=questions', 200);
  await expectStatus('instructor', 'can list questions', instructor.jwt, 'GET', '/api/questions', 200);

  await expectStatus('instructor', 'cannot write a blog post', instructor.jwt, 'POST', '/api/blog-posts', 403, {
    data: { title: 'Nope', slug: `instructor-post-${stamp}` },
  });

  await expectStatus(
    'instructor',
    'cannot enroll in a course',
    instructor.jwt,
    'POST',
    '/api/enrollments/enroll',
    403,
    { courseId: jsCourse.documentId }
  );

  await expectStatus(
    'instructor',
    'cannot submit a quiz attempt',
    instructor.jwt,
    'POST',
    `/api/quizzes/${jsQuiz.documentId}/submit`,
    403,
    { answers: [] }
  );

  await expectStatus('instructor', 'cannot open the admin panel API', instructor.jwt, 'GET', '/api/platform/stats', 403);

  // ---------------------------------------------------------------------------
  heading('Content Manager');
  // ---------------------------------------------------------------------------
  await expectStatus(
    'content-manager',
    'can edit any course, including an instructor’s',
    cm.jwt,
    'PUT',
    `/api/courses/${jsCourse.documentId}`,
    200,
    { data: { description: 'Edited by the content manager.' } }
  );

  const post = await call(cm.jwt, 'POST', '/api/blog-posts', {
    data: {
      title: `Smoke Post ${stamp}`,
      slug: `smoke-post-${stamp}`,
      excerpt: 'Written by the smoke test.',
      body: 'Body text.',
    },
  });

  expectTrue(
    'content-manager',
    'can write a blog post',
    post.status === 200 || post.status === 201,
    `status ${post.status}`
  );

  const postId = post.json?.data?.documentId;

  const beforePublish = await call(null, 'GET', `/api/blog-posts/${postId}`);
  expectTrue(
    'content-manager',
    'a new post starts as a draft and is invisible to the public',
    beforePublish.status === 404,
    `status ${beforePublish.status}`
  );

  await expectStatus('content-manager', 'can publish a post', cm.jwt, 'POST', `/api/blog-posts/${postId}/publish`, 200);

  const afterPublish = await call(null, 'GET', `/api/blog-posts/${postId}`);
  expectTrue(
    'content-manager',
    'a published post is readable by anyone',
    afterPublish.status === 200,
    `status ${afterPublish.status}`
  );

  await expectStatus(
    'content-manager',
    'editing a published post updates the live version',
    cm.jwt,
    'PUT',
    `/api/blog-posts/${postId}`,
    200,
    { data: { title: `Smoke Post ${stamp} (edited)` } }
  );

  const afterEdit = await call(null, 'GET', `/api/blog-posts/${postId}`);
  expectTrue(
    'content-manager',
    'the edit is what the public sees, not a stale copy',
    afterEdit.json?.data?.title === `Smoke Post ${stamp} (edited)`,
    `public title = ${afterEdit.json?.data?.title}`
  );

  await expectStatus(
    'content-manager',
    'can unpublish a post again',
    cm.jwt,
    'POST',
    `/api/blog-posts/${postId}/unpublish`,
    200
  );

  const afterUnpublish = await call(null, 'GET', `/api/blog-posts/${postId}`);
  expectTrue(
    'content-manager',
    'an unpublished post disappears from the public API again',
    afterUnpublish.status === 404,
    `status ${afterUnpublish.status}`
  );

  await expectStatus('content-manager', 'cannot list platform users', cm.jwt, 'GET', '/api/platform/users', 403);
  await expectStatus(
    'content-manager',
    'cannot change a user’s role',
    cm.jwt,
    'PUT',
    `/api/platform/users/${student.user.id}/role`,
    403,
    { role: 'admin' }
  );

  // ---------------------------------------------------------------------------
  heading('Admin');
  // ---------------------------------------------------------------------------
  const stats = await call(admin.jwt, 'GET', '/api/platform/stats');
  expectTrue(
    'admin',
    'can read platform stats',
    stats.status === 200 && typeof stats.json?.data?.users?.total === 'number',
    `${stats.json?.data?.users?.total} users, ${stats.json?.data?.courses?.total} courses, ${stats.json?.data?.enrollments?.total} enrollments`
  );

  expectTrue(
    'admin',
    'stats count blog documents once, not twice per draft/published pair',
    stats.json?.data?.blogPosts?.total ===
      stats.json?.data?.blogPosts?.published + stats.json?.data?.blogPosts?.drafts,
    `total ${stats.json?.data?.blogPosts?.total} = ${stats.json?.data?.blogPosts?.published} published + ${stats.json?.data?.blogPosts?.drafts} drafts`
  );

  const userList = await call(admin.jwt, 'GET', '/api/platform/users');
  expectTrue(
    'admin',
    'can list users with their roles',
    userList.status === 200 && (userList.json?.data ?? []).length >= 5,
    `${userList.json?.data?.length ?? 0} users`
  );
  expectTrue(
    'admin',
    'the user list does not expose password or reset tokens',
    !JSON.stringify(userList.json).match(/password|resetPasswordToken|confirmationToken/i),
    'no credential fields in the payload'
  );

  const promoted = await call(admin.jwt, 'PUT', `/api/platform/users/${student.user.id}/role`, {
    role: 'instructor',
  });
  expectTrue(
    'admin',
    'can promote a student to instructor',
    promoted.status === 200 && promoted.json?.data?.role?.type === 'instructor',
    `role = ${promoted.json?.data?.role?.type}`
  );

  const demoted = await call(admin.jwt, 'PUT', `/api/platform/users/${student.user.id}/role`, {
    role: 'student',
  });
  expectTrue(
    'admin',
    'can change the role back',
    demoted.json?.data?.role?.type === 'student',
    `role = ${demoted.json?.data?.role?.type}`
  );

  await expectStatus(
    'admin',
    'rejects an unknown role name',
    admin.jwt,
    'PUT',
    `/api/platform/users/${student.user.id}/role`,
    400,
    { role: 'superuser' }
  );

  const adminCount = (userList.json?.data ?? []).filter((u) => u.role?.type === 'admin').length;

  if (adminCount === 1) {
    await expectStatus(
      'admin',
      'cannot demote the last remaining admin',
      admin.jwt,
      'PUT',
      `/api/platform/users/${admin.user.id}/role`,
      400,
      { role: 'student' }
    );
  } else {
    record('admin', 'cannot demote the last remaining admin', true, `skipped — ${adminCount} admins exist`);
  }

  await expectStatus(
    'admin',
    'can delete any course',
    admin.jwt,
    'DELETE',
    `/api/courses/${createdCourse.documentId}`,
    [200, 204]
  );

  await expectStatus('admin', 'can delete any blog post', admin.jwt, 'DELETE', `/api/blog-posts/${postId}`, [200, 204]);

  // Cleanup: leave the seeded student's data alone, but drop the smoke enrollment.
  await call(student.jwt, 'DELETE', `/api/enrollments/me/${jsCourse.documentId}`);

  // The seeded student is untouched by all of the above.
  const seededProgress = await call(seededStudent.jwt, 'GET', `/api/courses/${jsCourse.documentId}/my-progress`);
  expectTrue(
    'isolation',
    'one student’s progress does not affect another’s',
    seededProgress.json?.data?.percentage === 40,
    `seeded student is at ${seededProgress.json?.data?.percentage}% (expected 40)`
  );

  // ---------------------------------------------------------------------------
  const total = results.length;
  const passed = total - failures;

  console.log(`\n${color.bold('─'.repeat(60))}`);
  console.log(
    `${color.bold('Result')}  ${failures === 0 ? color.green(`${passed}/${total} passed`) : color.red(`${passed}/${total} passed, ${failures} failed`)}`
  );
  console.log(`${color.bold('─'.repeat(60))}\n`);

  if (failures > 0) {
    console.log(color.red('Failures:'));
    for (const result of results.filter((r) => !r.passed)) {
      console.log(`  [${result.group}] ${result.name} — ${result.detail}`);
    }
    console.log('');
  }

  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(`\n${color.red('Smoke test could not run:')} ${error.message}\n`);
  process.exit(1);
});
