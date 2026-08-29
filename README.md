# CourseCatalyst — Learning Management System

A four-role learning platform: courses and lessons, student enrollment with progress
tracking, auto-graded MCQ quizzes, public profiles, per-role analytics dashboards, a blog
with draft/publish and threaded discussion, and an admin panel.

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | Next.js 16 (App Router) | Vercel |
| Backend / CMS | Strapi 5 (TypeScript) | Railway |
| Database | SQLite locally, Postgres in production | Railway |

```
LMS-project/
  backend/     Strapi 5 - API, data model, role-based access control
  frontend/    Next.js 16 - public site, auth, role-aware dashboards
```

**Live:**

| | |
|---|---|
| Site | https://course-catalyst-lac.vercel.app |
| API | https://lms-project-production-19cf.up.railway.app |
| Strapi CMS | https://lms-project-production-19cf.up.railway.app/admin |

**418 automated checks** cover it: 101 backend permission-matrix assertions and 317 browser
checks across ten Playwright suites.

---

## Running the backend locally

Requires Node 20–22 (developed on 22.13) and npm.

```bash
cd backend
npm install

cp .env.example .env
# Replace every "tobemodified" secret. Generate one with:
#   node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"
# Leave SEED_DEMO_DATA=true for a populated database on first boot.

npm run develop
```

Strapi comes up on **http://localhost:1337**. Open `/admin` and create the Strapi
administrator when prompted — that account manages the CMS itself and is separate from the
application roles below.

The database is SQLite (`backend/.tmp/data.db`), created automatically. Delete that file to
start from scratch.

### Demo accounts

Created by the seed when `SEED_DEMO_DATA=true`. **The password is the same for all five**:
`SEED_PASSWORD` from `.env`, which defaults to `Passw0rd!23`.

Sign in at **http://localhost:3000/login** locally, or at
**https://course-catalyst-lac.vercel.app/login** on the live site — the same seed runs in
both, so these accounts work in either place.


#### What each account is for

**Admin — `admin@lms.test`**
The only role that can assign roles. Its Dashboard button goes straight to `/admin` rather
than `/dashboard`, because for an admin the panel *is* the dashboard.
*Try:* `/admin` → search the user list, filter by role or status, change somebody's role,
then use the three access switches to block an account or restrict it from course or blog
features. Every restriction is enforced server-side, not by hiding buttons.

**Content Manager — `cm@lms.test`**
Owns the blog and may edit any course on the platform, but cannot touch user roles.
*Try:* `/dashboard` for the writing analytics — published/draft split, a six-month
publishing timeline and the most-discussed posts. Then `/studio/blog` to search and filter
your posts, and to move one between draft and published.

**Instructor — `instructor@lms.test`**
Owns 9 of the 14 seeded courses; the content manager owns the other 5. Everything is scoped
to their own — the backend returns 404 for a course they do not own, it is not merely
hidden.
*Try:* `/dashboard` for the cohort charts, then click any course to open its insights page:
completion per lesson, average mark per quiz, and the enrolled students. Click a student to
see every lesson they have finished and every quiz answer marked against the correct one.

**Student — `student@lms.test`**
Enrolled in two courses and left partway through one of them — 2 of 5 lessons, so the
percentage is neither 0 nor 100 and the charts have something real to plot.
*Try:* `/dashboard` for completion and quiz-mark charts, `/my-courses` to carry on, then
`/learn/<slug>` for the sequential player — mark a lesson complete and watch the percentage
recompute on the server.

**Student (empty) — `student2@lms.test`**
Enrolled in nothing. Use this one to see empty states, to enroll from scratch, and to check
that a fresh account really is a student — sign-up cannot choose a role.

#### Seeded content

Two seeds, on a fresh database, controlled by separate flags.

| | `SEED_DEMO_DATA` — fixture | `SEED_CATALOG` — catalog | Together |
|---|---|---|---|
| Courses | 4 (3 published, 1 draft) | 10 published | **14** |
| Lessons | 16 | 150 — 15 per course | **166** |
| Quizzes | 4 | 50 — 5 per course | **54** |
| Questions | 11 | 200 — 4 per quiz | **211** |
| Blog posts | 2 (1 published, 1 draft) | 15 (13 published, 2 drafts) | **17** |

The **fixture** seed is chosen to exercise the awkward cases rather than to look full: a
course owned by the instructor and one owned by the content manager, so "own only" versus
"any course" is actually testable; an unpublished course, to prove a student cannot see or
enroll in it; a course with no quiz, so the quiz UI has to cope with nothing to take; a
student left partway through, so the percentage is neither 0 nor 100; and one draft post
that must stay invisible to the public.

The **catalog** seed is content — ten real courses, each five groups of three lessons with a
checkpoint quiz after each group. It is idempotent, skipping any slug that already exists,
so it is safe to leave enabled and safe to re-run against a populated database.

Only `student@lms.test` is enrolled by the seed. `student2@lms.test` starts with nothing.

### Verifying it works

```bash
npm run smoke
```

Logs in as each role and walks the whole permission matrix — **101 checks** covering what
each role may and may not do, the progress arithmetic, quiz grading, and the two leak paths
that matter (quiz answers, blog drafts). Everything should read `PASS`.

---

## Running the frontend locally

The backend must be running first: the Next server calls it during render.

```bash
cd frontend
npm install
cp .env.example .env.local     # STRAPI_URL defaults to http://127.0.0.1:1337
npm run dev                    # http://localhost:3000
```

`npm run build` for a production build, `npm run lint` for the linter.

### Browser tests

Ten Playwright suites, **317 checks**, run against a live backend and a running frontend:

```bash
python frontend/scripts/browser-test.py             # 30  public pages, auth, all four roles
python frontend/scripts/browser-test-student.py     # 26  lessons, progress, quiz
python frontend/scripts/browser-test-authoring.py   # 32  studio, blog publishing, admin roles
python frontend/scripts/browser-test-social.py      # 35  blog engagement, notifications, course discussion
python frontend/scripts/browser-test-uploads.py     # 20  cover uploads, and who may upload
python frontend/scripts/browser-test-profile.py     # 32  profiles, avatars, public/private split
python frontend/scripts/browser-test-dashboards.py  # 26  the four role dashboards
python frontend/scripts/browser-test-learner.py     # 32  per-student records, expanding cards
python frontend/scripts/browser-test-lists.py       # 29  search, filters, access toggles, un-enrol
python frontend/scripts/browser-test-extras.py      # 55  attempt limits, certificates, ratings, audit, CSV
```

Run them one at a time. Back to back, the later suites start losing logins to Strapi's rate
limit on `/auth/local` — which is the rate limiter working correctly, and the suites being
an abusive client.

They assert behaviour rather than pixels: that a lesson body never appears on a public page,
that the quiz HTML contains no answer key, that progress survives a reload, that a
non-student cannot open the player, and that a restricted account is refused by the *API*
rather than merely losing a button.

### How authentication works

The browser never holds the Strapi JWT.

1. The login form posts to `/api/auth/login`, a route handler on the Next server.
2. That handler exchanges the credentials with Strapi and writes the JWT into an
   **httpOnly, SameSite=Lax cookie**. The response body contains the user, never the token.
3. Server Components read the cookie and call Strapi with it. `src/lib/strapi.ts` is marked
   `server-only`, so importing it from a Client Component fails the build.

The token is therefore unreadable by any script on the page, which is verified by a test
asserting `document.cookie` does not contain it.

### Design system

Four supplied colours, used at both ends of the range in both themes.

| | |
|---|---|
| `#000000` | black |
| `#1F150C` | warm near-black |
| `#412D15` | mid brown |
| `#E1DCC9` | bone |

Light mode puts bone on the ground and black on the type; dark mode swaps them. The mid
brown is the connective tissue in both: rules, muted type, chips and hover states. Surfaces
and hairlines are tints and shades mixed between those four rather than new hues, and every
derived value is marked as such in `globals.css`.

The primary fill is the warm near-black carrying bone text in light (about 14:1), inverted
in dark. A browser test asserts all four seeds actually appear on the page, so the palette
cannot drift.

Playfair Display carries the display sizes, Geist carries everything read at length.
Cards at 14px radius, controls at 10px.

**The hero** is a full-bleed black band pulled up behind the floating header, with bone
display type on an asymmetric 6/5 and the image bleeding off the right edge. Putting the
two extremes of the palette against each other in the first screen is the strongest move
it allows, and the hard edge where the band ends gives the page structure.

Courses and blog posts render as image-forward cards.

---

### Route protection

Three layers, deliberately:

| Layer | File | What it decides |
|---|---|---|
| Edge | `src/proxy.ts` | Is there a session cookie at all? Anonymous visitors are redirected to `/login?next=...` |
| Page | `src/lib/guards.ts` | Does this user's role allow this page? Wrong role goes to `/forbidden` |
| API | Strapi policies and controllers | The real boundary. Re-checked on every request |

`proxy.ts` is Next 16's replacement for `middleware.ts` (same feature, renamed). It
deliberately does not check roles: a Strapi JWT carries no role claim, so doing so would
mean a backend round trip on every navigation. Deleting both frontend layers would change
nothing about what data a user can actually reach.

---

## Roles and permissions

| Action | Admin | Content Manager | Instructor | Student |
|---|---|---|---|---|
| Manage users & assign roles | ✅ | ❌ | ❌ | ❌ |
| Create / edit / delete any course | ✅ | ✅ | Own only | ❌ |
| Add / edit / delete lessons | ✅ | ✅ | Own courses | ❌ |
| Create quizzes | ✅ | ✅ | Own courses | ❌ |
| View student progress | ✅ | ✅ | Own courses | Own only |
| Write / manage blog posts | ✅ | ✅ | ❌ | ❌ |
| Enroll in a course | ❌ | ❌ | ❌ | ✅ |
| Take quizzes | ❌ | ❌ | ❌ | ✅ |
| Remove a student from a course | ✅ | ✅ | Own courses | ❌ |
| Block or restrict an account | ✅ | ❌ | ❌ | ❌ |
| Edit their own profile | ✅ | ✅ | ✅ | ✅ |
| Rate a course | ❌ | ❌ | ❌ | Enrolled only |
| Ask a question on a course | ✅ | ✅ | ✅ | ✅ |
| Reply to a question | ✅ | ✅ | Own courses | Own comment only |

The last six rows are additions beyond the original spec matrix, enforced the same way.

Enforced on the backend in three layers — the users-permissions grid, route policies, and
ownership checks inside the controllers. See [ARCHITECTURE.md](ARCHITECTURE.md) for how and
why.

---

## Features completed

**Part 1 — backend** ✅

- [x] Authentication with four roles; new sign-ups are students and cannot self-promote
- [x] Role-based route protection enforced server-side, verified by an 80-check suite
- [x] Courses, lessons (text or video URL), quizzes and MCQ questions
- [x] Student enrollment, with duplicate enrollment rejected
- [x] Progress tracking — mark complete / undo, accurate per student per course, persisted
- [x] Quiz auto-grading with stored, re-viewable attempts
- [x] Admin panel API — user list, role assignment, platform stats
- [x] Blog with draft vs published, drafts invisible to the public
- [x] Seed data and a smoke test

**Part 2 - Next.js foundation** ✅

- [x] Design system: Geist type, one accent, locked radii, light and dark themes
- [x] httpOnly cookie session over Strapi JWT; signup, login, logout, current user
- [x] Route protection at the edge, role guards on pages, `/forbidden` for wrong role
- [x] Landing page, course catalog with level filter, course detail with locked syllabus
- [x] Blog index and post pages; drafts never reach the public API
- [x] Role-aware `/dashboard`: student progress, staff course list, admin platform stats
- [x] Working enrollment from the course page
- [x] Loading skeletons, empty states, error boundary, 404, no-JS fallback for reveals
- [x] 30-check browser suite covering all four roles, dark mode and 375px layout
**Part 3 - student experience** ✅

- [x] Redesigned frontend: dark-first product-grade system, lime accent, mono data labels
- [x] `/my-courses` with progress rings, unfinished courses first, quiz result history
- [x] Course player at `/learn/[slug]` with a sticky contents rail that survives navigation
- [x] `/learn/[slug]` resumes at the first unfinished lesson
- [x] Lesson viewer for text and embedded video (YouTube and Vimeo links normalised)
- [x] Mark complete and undo, server-recomputed percentage, persists across reloads
- [x] Quiz runner with instant auto-graded score, marked answers and attempt history
- [x] Player is student-only, enrollment-gated, and 404s on unpublished courses
- [x] 25-check browser suite for the student journey
**Part 6 - monochrome redesign and cover uploads** ✅

- [x] Brand colour removed entirely; ink on paper, colour only as state
- [x] Landing and catalog relaid out around an editorial index, not card grids
- [x] Cover images uploaded from the device, with drag and drop, or pasted as a URL
- [x] Upload permission limited to the three authoring roles
- [x] `isRenderableImage` guard, after a malformed cover URL took down the blog index
- [x] 18-check browser suite for uploads and the redesign

**Part 5 - blog engagement, notifications, editorial redesign** ✅

- [x] Blog linked from the header as "Blog" (it was labelled "Writing", which hid it)
- [x] Likes on posts, public count, toggle for signed-in users
- [x] Threaded comments with replies, edit and delete, moderation for admin and CM
- [x] Notification system across ten events, with a polling bell and a full inbox
- [x] Frontend redesigned: ink-and-paper editorial, Playfair over Geist, deep green accent
- [x] 26-check browser suite for reading, engagement and notifications

**Part 4 - authoring, admin and deployment** ✅

- [x] Studio at `/studio`: course list scoped by role, create, edit, delete
- [x] Lesson editor with written and video types, explicit ordering
- [x] Quiz editor; the correct answer is picked with a radio, never a typed index
- [x] Per-course student progress and best quiz score for the owning staff
- [x] Blog editor with save-as-draft and publish/unpublish as separate actions
- [x] Admin panel at `/admin`: platform stats, user table, role assignment
- [x] Bootstrap admin via `BOOTSTRAP_ADMIN_EMAIL`, closing the first-admin gap
- [x] Publishing invalidates the cached public pages, so it is visible immediately
- [x] Deployment configs for Railway and Vercel
- [x] 32-check browser suite for authoring, publishing and role management

**Part 7 - profiles, analytics dashboards, search and moderation** ✅

- [x] Public profiles at `/u/[username]`, readable signed out, with avatar upload
- [x] Role-specific dashboards: student statistics, instructor cohorts, writer blog data
- [x] Charts drawn in SVG as Server Components — no charting library, no client bundle
- [x] Per-course insights: completion per lesson, mark per quiz, the enrolled cohort
- [x] Per-student records with every finished lesson and every marked quiz answer
- [x] Search and filters on the catalog, the blog, both studio lists and the cohort
- [x] Catalog cards expand on hover, matching the blog index
- [x] Block, restrict-from-courses and restrict-from-blog, enforced server-side
- [x] Un-enrol a student from a course, with their lesson progress cleared
- [x] Ten-course seeded catalog: 150 lessons, 50 quizzes, 15 blog posts
- [x] 116-check browser suites for profiles, dashboards, records, search and moderation

**Part 8 - attempt limits, certificates, ratings, audit trail, CSV export** ✅

- [x] Quiz attempt limits, default 4, configurable per quiz; `0` means unlimited
- [x] Certificates on completion — every lesson finished *and* the quiz passed
- [x] Serial numbers in an ambiguity-free alphabet, verifiable at `/certificates/[serial]`
      without a login, because a certificate nobody can check is not a certificate
- [x] Star ratings and written reviews on courses, restricted to enrolled students
- [x] Average rating shown on catalog cards; reaction and comment counts on blog cards
- [x] Audit trail of every privileged action, admin-readable, with no update or delete route
- [x] CSV export of the user list and of a course's cohort, escaped against formula injection
- [x] Both `/admin` lists scroll inside themselves, so the page does not grow with the data
- [x] 55-check browser suite for all five

**Part 9 - course discussion and layout** ✅

- [x] Threaded discussion on every course, readable signed out
- [x] Reply restricted: teaching staff, or the person who wrote the comment
- [x] Staff answers badged with their role, so an answer reads differently from a guess
- [x] Page width steps by viewport (1152 / 1500 / 1900) with the type scale to match
- [x] Blog posts relaid out: cover left, large title right, justified body beneath
- [x] 9 more browser checks and 15 more backend checks

---

## Profiles

Every account has a public profile at `/u/[username]`, linked from the avatar in the header
and from every byline and comment. It is readable signed out — that is the point of it.

Visibility follows one rule: **published work is public, drafts and contact details are
not.** A visitor sees an instructor's published courses and a content manager's live posts.
Only the account holder sees their own draft counts, their email, or their learning
progress.

The endpoint is custom rather than a `users` read, because no role in this application is
granted `plugin::users-permissions.user.find` and none should be: the user table holds
password hashes and reset tokens, and the content API's field selection is a query
parameter. Every field returned is named explicitly, so adding a private column can never
leak it by accident.

Editing is at `/settings/profile`. **There is no user id anywhere in that form** — the
endpoint takes the account from the session cookie, so there is nothing in the request to
tamper with. Four fields are writable; role, email and `blocked` are not in the pick list.

---

## Dashboards

One route, three views and a redirect, because the roles are asking different questions.

| Role | Question it answers |
|---|---|
| Student | How am I doing — completion ring, per-course bars, quiz-mark trend |
| Instructor | Which course needs attention — cohort charts, courses ranked by enrolment |
| Content Manager | Is my writing landing — published/draft split, timeline, engagement |
| Admin | Redirected to `/admin`; the panel *is* the dashboard |

The student dashboard used to render the same course grid as `/my-courses`, which made one
of the two pages redundant. They are now split by question rather than by data: **My
Courses is where you go to carry on, the dashboard is where you go to see how it is going.**

Charts are hand-drawn SVG — a ring, a bar column, a sparkline, a stacked bar. A charting
library would add a large client bundle to pages that are otherwise entirely
server-rendered, and would then have to be re-themed anyway. Every value is also exposed as
text, because a chart that only exists visually is one a screen-reader user cannot read.

---

## Course insights and student records

Clicking a course on the instructor dashboard opens `/studio/courses/[id]/insights`, not the
public course page. The public page sells the course; this one answers whether it is
working — completion per lesson **in course order**, so the steepest drop shows where people
stop, and average mark per quiz, where a low bar is usually a bad question.

The whole page is one request. Computing each student's progress with the per-student
helper would be one query each; this gathers everything in five, so a cohort of forty does
not cost forty round trips.

Clicking a student opens their full record: every course they are enrolled in, every
individual lesson with the date it was completed, and every quiz attempt with each question
marked against what they chose. Cards expand by growing — the opened card takes the main
column and the rest collapse into a rail beside it, on the same `flex-grow` transition the
blog index uses.

**An instructor sees this filtered to their own courses, and is told so.** They are not
refused outright — the matrix says "view student progress: own courses" — but a partial
record presented as a whole one would let them conclude a student has done nothing when
they have simply done it elsewhere.

---

## Search, filters and moderation

Search and filters are on the catalog, the blog, both studio lists, the admin user table
and the course cohort. One component drives all of them.

State lives in the URL rather than in client state, which makes a filtered view linkable,
survivable across a refresh and steppable with the back button — and keeps the pages Server
Components. For the public lists the filtering happens over the already-cached list rather
than in the Strapi query: the catalog and blog are cached under one tag each, and a per-term
query would fragment that into a cache entry for every string anybody has typed.

Moderation is three switches per user in `/admin`, not one:

| Switch | Effect |
|---|---|
| **Blocked** | Cannot sign in at all — enforced by users-permissions itself |
| **Courses** | Cannot enroll or submit a quiz attempt |
| **Blog** | Cannot comment or like |

"This person should not be here" and "this person is misusing the comments" are different
judgements. Collapsing them into a single Block would make removing the account the only
response to a bad comment.

None of them hides anything: a restricted student still reads the course and the thread. The
restriction is on taking part, not on looking. All three are read from the session user on
every request, so a restriction takes effect on the offender's **next request** rather than
when their session expires.

---

## Blog, discussion and notifications

The blog is public and linked from the header. Anyone can read a published post and its
discussion; writing requires an account.

**Likes** are rows, not a counter. The count is `SELECT count(*)`, so it cannot drift from
the set of people who actually liked the post and unliking cannot push it below zero.

**Comments** nest one level. Replies to replies are attached to the top-level comment they
descend from, because past one level the indentation costs more than the hierarchy buys.
The author can edit or delete their own; an admin or content manager can delete any, but
cannot edit one: putting words in somebody's mouth is worse than removing them.

Both reference the post by `postDocumentId` rather than a Strapi relation. Draft & Publish
stores a draft row and a published row per document, and a relation would bind each comment
to one of those rows and strand it on the next publish. The trade is no database cascade, so
deleting a post clears its comments and likes explicitly.

**Notifications** are raised by `src/utils/notify.ts`, which every feature calls. Twelve
event types are wired:

| Event | Who hears about it |
|---|---|
| Comment on a post | the post's author |
| Comment on a course | the course owner |
| Reply to a comment | the person replied to |
| Post liked | the post's author |
| Student enrolls | the course owner |
| Quiz submitted | the course owner |
| Quiz graded | the student who sat it |
| Course published | everyone enrolled |
| Lesson added | everyone enrolled on a published course |
| Post published | every student, on first publication only |
| Role changed | the user whose role changed |
| Course reviewed | the course owner |

Three rules are enforced centrally rather than at each call site: nobody is ever notified
about their own action, recipients are deduplicated so a fan-out cannot double-send, and a
failed write is swallowed so a notification can never roll back the enrollment or comment
that caused it.

The bell polls a count-only endpoint every 60 seconds and fetches the list only when
opened. A socket would be the right answer for a chat product; here the events arrive
minutes apart and a socket's reconnect, sleep and multi-tab handling costs more than it saves.

---

## Attempt limits, certificates, ratings, audit trail, export

**Quiz attempt limits.** Four by default, set per quiz. `0` means unlimited; `null` means
never configured and takes the default. That distinction matters because schema defaults
apply only on *create* — every quiz that existed before the field did came back `null`, and
a boot-time backfill closes that gap rather than leaving old quizzes silently uncapped.

**Certificates** are issued when a course is genuinely finished: every lesson complete *and*
the quiz passed. Serials are `CC-XXXX-XXXX-XXXX` from a 32-character alphabet with the
ambiguous glyphs removed, so a serial read aloud or copied off a screenshot survives the
trip. `/certificates/[serial]` verifies one **without a login** — a certificate only its
owner can check is not a credential. Issuing is idempotent: finishing a course twice does
not mint a second one.

**Ratings and reviews** are limited to students enrolled in the course. That excludes staff
by construction, which is the point: an instructor rating their own course is not a review,
and a catalog whose stars can be set by anyone with an account is worth less than no stars.
One review per person per course — submitting again edits the existing one. Averages appear
on catalog cards.

**Audit trail.** Every privileged action — role changes, access restrictions, un-enrolments —
is written with the actor and target *labels snapshotted at the time*, not joined at read
time, so the record still reads correctly after an account is renamed or deleted. There is
no update or delete route: an audit log you can edit is not an audit log. Admin-readable
only, and a failed write never rolls back the action it was recording.

**CSV export** for the user list and for a course's cohort. Any field starting with `=`,
`+`, `-`, `@`, tab or carriage return is escaped, because a spreadsheet treats those as the
start of a formula — a display name of `=cmd|...` is a live attack against whoever opens the
file, not a cosmetic problem.

---

## Course discussion

Every course carries its own thread, readable signed out — a discussion you cannot read
until you enroll cannot help you decide whether to enroll.

**Who may reply is the feature.** Anyone signed in may ask a question. A reply may only come
from the teaching staff for that course, or from the person who asked:

| Who | May reply to |
|---|---|
| Admin | anyone, on any course |
| Content Manager | anyone, on any course |
| Instructor | anyone, **on a course they own** |
| Student | **their own comment only** |

An instructor's authority in the thread is scoped by `canManageCourse` — the same helper
that decides who may edit that course's lessons and quizzes. On somebody else's course an
instructor is an ordinary participant. That keeps the discussion consistent with the
permission matrix rather than inventing a second, looser one.

The rule is one function in `backend/src/api/course-comment/controllers/course-comment.ts`:

```ts
const canReply = (user, parent, course) => {
  if (canManageCourse(user, course)) return true;
  return parent.author?.id === user.id;
};
```

It is checked on the server, after loading both the parent comment and the course, because
deciding it needs the parent's author and the course's owner — neither of which can be
trusted from the request. The frontend hides a Reply button it knows would 403, but that is
a courtesy: editing the client grants nobody anything.

This is a **separate content type** from the blog thread rather than a `targetType` flag on
the existing one. The reply rules differ, and folding both into one controller would thread
a discriminator through every branch of the permission check — the one place where two
features' rules must not be confusable.

Like the blog thread it references its parent by a plain `courseDocumentId` string. Courses
use Draft & Publish, so a relation would bind each comment to the draft *or* the published
row and strand it on the next publish. The trade is no database cascade, so deleting a
course clears its comments explicitly.

Staff replies carry the author's role, badged in the UI, so a student can tell an
instructor's answer from another student's guess at a glance.

---

## Cover images

Both upload and URL, in one control.

Uploading posts the file to `/api/upload`, which attaches the session JWT server-side and
forwards it to Strapi's upload plugin. The browser never holds the token, so this works the
same way as every other write.

The route validates before forwarding: images only, 5MB maximum.

`plugin::upload.content-api.upload` was originally granted to the three authoring roles
only. Profile pictures changed that: every account has an avatar, so it is now granted to
all four signed-in roles and withheld from the public role — an anonymous upload endpoint is
a free file host. The widening is in *who*, not in *what*: the type allowlist and size cap
still apply to everyone, and `destroy` is still not granted, since deleting an upload by id
would let one author remove another's cover.

`next.config.ts` derives its `remotePatterns` entry from `STRAPI_URL` rather than
hard-coding a host, so uploaded covers resolve on Railway as well as locally.

A URL can still be pasted, because the seeded content references images that way and an
editor holding a link should not have to download it first.

**Stored URLs are validated at every render site** by `isRenderableImage`. `next/image`
throws on a src it cannot parse, and a throw in a Server Component takes down the whole
route: a single post whose cover field contained the word "no" took the entire blog index
offline for every visitor until this guard was added.

---

## How roles are assigned

Nobody chooses their own role.

1. **Everyone signs up the same way** and lands as `student`. Two things enforce it: the
   users-permissions default role, and `register.allowedFields: []`, which makes `role` an
   invalid parameter. Sending one returns `400 ValidationError`, not a silent ignore.
2. **An admin changes it** from `/admin`. The change takes effect on the user's existing
   session, because the role is re-read from the backend on every request rather than
   baked into the JWT.
3. **The first admin** comes from `BOOTSTRAP_ADMIN_EMAIL`. Sign up with that address, set
   the variable, restart; the account is promoted on boot. It only ever promotes, never
   demotes, and it never creates an account, so the person still has to prove they own the
   address by registering.

The backend refuses to demote the last remaining admin.

---

## Deploying

Both hosts deploy from this one repo, each pointed at a different subdirectory. The build
and start commands live in `backend/railway.json` rather than in the Railway UI, so a
recreated service comes back configured.

The two services need each other's URL and neither exists yet, so the order matters:
**Railway first**, then Vercel, then set `FRONTEND_URL` back on Railway.

### Backend on Railway

1. **New project → Deploy from GitHub repo**, then **Settings → Source → Root Directory**
   = `backend`. The first build fails before you set this — the repo root holds two apps and
   no application of its own.
2. **New → Database → PostgreSQL.** Reference it rather than pasting the connection string:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
   | `DATABASE_SSL` | `false` |

   `config/database.ts` treats the presence of `DATABASE_URL` as "we are on Postgres" and
   reads no other database variable, so leave `DATABASE_CLIENT` and friends unset.

   `DATABASE_SSL=false` is not optional. The config defaults SSL *on* when `DATABASE_URL`
   exists — right for a public endpoint, wrong for Railway's private network, which does not
   offer TLS. Left unset you get `The server does not support SSL connections` and a crash
   loop that reads like a code fault.
3. Set the rest:

   | Variable | Value |
   |---|---|
   | `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY` | Fresh secrets, one per environment |
   | `NODE_ENV` | `production` |
   | `NODE_VERSION` | `22` |
   | `SEED_DEMO_DATA`, `SEED_PASSWORD`, `SEED_CATALOG` | Populate the demo accounts and catalog |
   | `FRONTEND_URL` | The Vercel URL — added after step 6 |

   Do **not** set `PORT` or `HOST`. Railway injects `PORT` and `config/server.ts` reads it;
   overriding either makes the healthcheck time out on an app that is running fine.

   ```bash
   node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"
   ```
4. Mount a **volume** at `/app/public/uploads`. Container filesystems are ephemeral, so
   uploaded avatars and covers vanish on the next deploy without one. With Root Directory
   set to `backend`, the container's `/app` *is* `backend/`.
5. **Settings → Networking → Generate Domain.**
6. Open `https://<your-app>.up.railway.app/admin` once and register. That URL is public and
   unclaimed until someone does — this is the Strapi CMS account, separate from the app's
   own `admin` role.

### Frontend on Vercel

1. Import the same repo, **Root Directory** `frontend`. Next.js is detected once it can see
   `frontend/package.json`.
2. Set `STRAPI_URL` to the Railway URL — `https`, no trailing slash — **on the import
   screen, before the first build.**

   `next.config.ts` reads it at *build* time to derive the `remotePatterns` entry for
   uploaded images and to decide whether the image optimiser's SSRF guard stays on. Build
   without it and the fallback is `127.0.0.1`: the build succeeds, every uploaded image
   returns `400 "url" parameter is not allowed`, and the SSRF guard is off in production
   with nothing in the log to say so. Adding the variable later requires a **rebuild**, not
   a restart.
3. Leave `SECURE_COOKIES` unset. The session cookie marks itself `Secure` in production
   automatically; the variable exists only to switch that off for a local HTTP build.
4. Deploy, then **Settings → General → Node.js Version → 22.x**.

### Closing the loop

Set `FRONTEND_URL` on Railway to the Vercel origin and redeploy. The browser never calls
Strapi directly — it calls this app's own `/api/auth/*` and the Next server calls Strapi —
so server-to-server traffic carries no `Origin` and CORS rarely bites. Set it anyway: it is
what stops another site's JavaScript reaching the API from a visitor's browser.

### Two things that will bite on a redeploy

**`npm ci` cannot run under Railway's build cache.** The builder mounts a cache at
`node_modules/.cache`, and `npm ci` begins by deleting `node_modules` wholesale — you cannot
unlink a live mount, so the build dies with `EBUSY` in about 45 seconds. The build command
empties `node_modules` around that mount and then installs.

**A schema change lengthens boot past the default healthcheck window.** Strapi answers
nothing until `bootstrap` finishes, and adding a content type puts a Postgres migration in
front of the seeding. Railway then kills a process that is working correctly, which surfaces
as `SIGTERM` on `strapi start` with no error above it. `railway.json` sets
`healthcheckTimeout: 300` for exactly this.

A superseded deployment logs the *same* `SIGTERM` and `Stopping Container` lines when a new
one replaces it. Tell them apart by what came before: a replaced container was serving 200s
right up to the signal; a failed one never served anything.

### First run in production

`SEED_DEMO_DATA=true` creates the four role accounts with `SEED_PASSWORD`, which is what
makes the demo logins above work. Understand the trade: it puts four accounts with a
documented password on the public internet. Correct for a graded submission where a reviewer
needs to sign in as each role; for anything real, seed once, then set it to `false` and
change the passwords.

To make your own account an admin, sign up on the live site, set `BOOTSTRAP_ADMIN_EMAIL` to
that address and redeploy. It only ever promotes an existing account, never creates one.

---

## Environment variables (backend)

| Variable | Purpose |
|---|---|
| `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY` | Strapi secrets — regenerate for every environment |
| `JWT_EXPIRES_IN` | How long a login lasts (default `7d`) |
| `DATABASE_CLIENT`, `DATABASE_FILENAME` | Local SQLite |
| `DATABASE_URL` | Set by Railway; its presence switches the app to Postgres |
| `DATABASE_SSL` | `false` on Railway's private network, which does not offer TLS. Defaults to `true` when `DATABASE_URL` is set |
| `NODE_ENV`, `NODE_VERSION` | `production` and `22`. `package.json` requires Node 20–26 |
| `FRONTEND_URL` | Comma-separated origins allowed through CORS |
| `SEED_DEMO_DATA`, `SEED_PASSWORD` | Fixture seed on boot — the demo accounts and a small dataset. Deliberately left **on** in this deployment so a reviewer can sign in as each role; off for anything real |
| `SEED_CATALOG` | Adds the full catalog (10 courses, 150 lessons, 50 quizzes, 15 posts). Idempotent: skips slugs that already exist |
| `BOOTSTRAP_ADMIN_EMAIL` | Promotes this address to admin on boot. Only ever promotes, and never creates an account |

## Environment variables (frontend)

| Variable | Purpose |
|---|---|
| `STRAPI_URL` | Origin of the Strapi API. Server-side only; never sent to the browser. **Read at build time** — changing it needs a rebuild, not a restart |
| `SECURE_COOKIES` | Leave unset. Only to disable the `Secure` cookie flag for a production build served over local HTTP |
