# Architecture — LMS backend

Notes on how the backend is put together and, more importantly, *why*. Written to be read
alongside the code.

---

## 1. Stack

| Layer | Choice |
|---|---|
| Backend / CMS | Strapi 5.52 (TypeScript) |
| Database | SQLite locally, Postgres on Railway |
| Auth | users-permissions JWT (`legacy-support` mode) |
| Frontend | Next.js on Vercel (Parts 2–4) |

Two config decisions worth knowing about:

**`jwtManagement: 'legacy-support'`** (`config/plugins.ts`). Strapi 5 defaults new projects to
`refresh` mode, which issues a short-lived access token plus a refresh token that the plugin
stores in *its own* cookie. The frontend keeps the JWT in an httpOnly cookie that the Next.js
route handlers own, so `refresh` mode would mean two cookies with two lifetimes and a refresh
dance on every expired request. One token, one cookie, one owner.

**`DATABASE_URL` implies Postgres** (`config/database.ts`). Railway injects a single
`DATABASE_URL` and never sets `DATABASE_CLIENT`, so the presence of that variable is what
switches the client. The same code boots on SQLite locally and Postgres in production with no
per-environment branching to remember.

---

## 2. Data model

```
User (users-permissions)
 ├── owns ─────────────▶ Course
 ├── authors ──────────▶ BlogPost
 ├── enrolls ──────────▶ Enrollment ──▶ Course
 ├── completes ────────▶ LessonProgress ──▶ Lesson, Course
 └── attempts ─────────▶ QuizAttempt ──▶ Quiz, Course

Course ──< Lesson          (order: integer, drives sequential viewing)
Course ──< Quiz ──< Question   (prompt, options: json, correctIndex: integer)
```

Three modelling decisions that are load-bearing:

**Questions are a collection type, not a component.** A component is serialized as part of its
parent, so `GET /api/quizzes/:id?populate=questions` would carry `correctIndex` wherever the
quiz went. As a separate content type the questions can be fetched, stripped and returned
independently — which is exactly what `/quizzes/:id/take` does.

**`LessonProgress.course` is denormalized.** It is reachable via `lesson.course`, but storing it
directly turns "how far through this course is this student" into one flat count instead of a
join across every lesson.

**Courses use an `isPublished` boolean; blog posts use Strapi's Draft & Publish.** Draft &
Publish stores two rows per document, and relations pointing *at* a D&P entry have to choose
which version they point at. Enrollments and progress rows point at courses, so courses stay
single-row. Blog posts are pointed at by nothing, so they use the real feature — which is what
the spec asks for anyway.

---

## 3. Access control — three layers

The spec says access control is itself part of the evaluation, and that it has to be enforced
on the backend rather than by hiding buttons. It is enforced three times, at three different
distances from the request.

### Layer 1 — the permission grid (`src/bootstrap/permission-map.ts`)

*Question answered: may this role call this endpoint at all?*

The four roles (`admin`, `content-manager`, `instructor`, `student`) and their route
permissions are declared in code and applied on every boot by `src/bootstrap/roles.ts`. The
sync is two-way: missing permissions are granted **and permissions that should not be there
are revoked**, so a checkbox switched on by hand in the Strapi admin UI is switched back off
on the next restart. A fresh database — a Railway redeploy, a teammate cloning the repo —
comes up with identical rules and nothing to configure by hand.

`setDefaultSignupRole` pins new sign-ups to `student`, and `register.allowedFields: []` in
`config/plugins.ts` stops `POST /api/auth/local/register` from accepting a `role` in the body.
Those two lines together are what prevent self-promotion to admin.

### Layer 2 — route policies (`src/policies/`)

*Question answered: may this particular user call it for this particular record?*

| Policy | Job |
|---|---|
| `global::has-role` | `config: { roles: [...] }` — the matrix, restated in source next to the route |
| `global::owns-course` | Instructor passes only for courses they own; admin and content manager always pass. `config: { subject: 'course' \| 'lesson' \| 'quiz' \| 'question' }` says how to walk from the record in `:id` back to its course |
| `global::is-enrolled` | Students must have an enrollment for the course that owns `:id`; staff pass through |

Policies run before the controller, so a rejected request never touches a query.

### Layer 3 — controllers (`src/api/*/controllers/`)

*Question answered: everything a URL cannot express.*

- **Create routes have no `:id`**, so `owns-course` cannot help them. `lesson.create`,
  `quiz.create` and `question.create` read the parent course out of the request body and check
  ownership against it. This is the hole an instructor would otherwise use to attach a lesson
  to somebody else's course.
- **Server-assigned identity.** `course.create` ignores any `owner` in the body and
  `blog-post.create` ignores any `author`; both are set from the JWT.
- **Scoped list queries.** `lesson.find` rewrites `ctx.query.filters` to the caller's
  enrolled courses (student) or owned courses (instructor). The filter is overwritten, not
  merged, so there is no query string that widens it.
- **Forced status.** `blog-post.find`/`findOne` pin non-staff callers to `status=published`,
  and `course.find` pins them to `isPublished: true`.
- **Answer stripping.** Everything student-facing runs through `stripAnswerKey`.

All the predicates live in one file, `src/utils/permissions.ts`, so there is a single place to
audit and a single place to fix.

---

## 4. Progress tracking (`src/utils/progress.ts`)

One `LessonProgress` row per (student, lesson) marked complete. The percentage is **derived,
never stored**:

```
percentage = completed lessons in this course / total lessons in this course
```

A stored counter would be a second copy of the truth and would drift the first time a lesson
was added or deleted. Deriving it means it is correct by construction after any edit.

`computeCourseProgress` counts *distinct existing* lessons. When a lesson is deleted Strapi
clears the relation but leaves the progress row for a moment, and a naive count could report
6 of 5 — 120%. Taking the intersection keeps the number honest.

Persistence across refreshes is not a feature that had to be built: the rows are in the
database, so any request recomputes the same number.

`POST /api/lesson-progresses/complete` is idempotent. Pressing the button twice must not
create a second row, because the percentage counts rows and duplicates would inflate it.

---

## 5. Quiz auto-grading (`src/utils/grading.ts`)

`gradeAttempt(questions, answers, passingScore)` is a **pure function** — no database, no
`ctx`, no Strapi. Grading a quiz is "compare two lists", so it is written as one, which makes
it readable on its own and leaves the controller responsible only for loading rows and saving
the result.

The flow in `quiz.submit` is one-directional:

1. load the questions **with** their answers from the database — never from the request
2. grade
3. persist a `QuizAttempt`
4. return the score plus a per-question breakdown

The client sends only which option it picked. A forged `score` in the request body is ignored
because the body is read for nothing except `answers`.

Edge cases the function handles rather than throwing on:

| Case | Behaviour |
|---|---|
| Question left unanswered | Counts as wrong |
| `selectedIndex` outside the option list | Treated as unanswered |
| Duplicate answers for one question | First wins, deterministically |
| Quiz with zero questions | Scores 0 instead of dividing by zero |
| Answer keyed by numeric id instead of documentId | Both accepted |

---

## 6. Two Strapi behaviours worth knowing

Both were found by the smoke test, and both would have been silent bugs.

**Relation inputs are permission-checked against the target.** Strapi's
`throw-restricted-relations` validator rejects any relation in a request body whose target the
caller cannot `find`. Since no application role is granted
`plugin::users-permissions.user.find` — deliberately, so the user list stays closed — sending
`owner` through `super.create()` fails with `Invalid key owner`. Opening the user list to work
around that would trade a real access boundary for convenience, so the entry is created
without the relation and `linkUserRelation` (`src/utils/resolve.ts`) sets it server-side
instead. The same validator is why `?populate=owner` returns nothing, and why course responses
carry a hand-built `instructor` projection instead.

**`POST` publishes immediately.** In Strapi 5 the REST create endpoint publishes a
Draft & Publish entry unless told otherwise, which would make the blog's draft state
meaningless — every new post would go live the moment it was written. `blog-post.create`
forces `status: 'draft'`. `update` writes to the draft and then re-publishes if the document
was already live, so editing a published post reaches readers instead of silently updating an
invisible copy.

---

## 7. API surface

Custom endpoints (core CRUD is the usual `/api/<plural>` set):

| Method | Route | Who |
|---|---|---|
| `POST` | `/api/enrollments/enroll` | student |
| `GET` | `/api/enrollments/me` | student |
| `DELETE` | `/api/enrollments/me/:courseId` | student |
| `POST` | `/api/lesson-progresses/complete` | student |
| `POST` | `/api/lesson-progresses/uncomplete` | student |
| `GET` | `/api/courses/:id/my-progress` | student |
| `GET` | `/api/courses/:id/students-progress` | admin / CM / owning instructor |
| `GET` | `/api/courses/mine` | admin / CM / instructor |
| `GET` | `/api/quizzes/:id/take` | enrolled student (staff may preview) |
| `POST` | `/api/quizzes/:id/submit` | enrolled student |
| `GET` | `/api/quiz-attempts/me` | student |
| `GET` | `/api/quiz-attempts/quiz/:id` | admin / CM / owning instructor |
| `GET` | `/api/blog-posts/mine` | admin / CM |
| `POST` | `/api/blog-posts/:id/publish` \| `/unpublish` | admin / CM |
| `GET` | `/api/platform/stats` | admin |
| `GET` | `/api/platform/users` | admin |
| `PUT` | `/api/platform/users/:id/role` | admin |

The admin endpoints are namespaced `/api/platform/...` rather than `/api/admin/...` so they
cannot be confused with Strapi's own `/admin` panel, which is a separate auth system —
Strapi admin users are not application users.

Two smaller notes:

- In Strapi 5 the `:id` in a content route is the **documentId**, not the numeric id. The
  exception is `/api/platform/users/:id/role`, where users-permissions addresses users
  numerically.
- Custom route files are named `01-*.ts` so they load before the core router. Koa matches in
  registration order, and without the prefix `GET /courses/:id` would swallow
  `GET /courses/mine` with `id = "mine"`.

---

## 8. Testing

`backend/scripts/smoke.mjs` — plain Node, no dependencies. It logs in as each role and walks
the entire permission matrix, asserting the status code of every interesting call plus the
content checks that matter: the answer key never reaching a student, drafts never reaching the
public, the percentage arithmetic, one student's progress not affecting another's.

```bash
npm run smoke        # 80 checks
```

Green means the matrix is enforced on the backend. That is the claim the spec grades, so it is
worth being able to re-run it in five seconds after any change.
