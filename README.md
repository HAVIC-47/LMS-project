# LMS — Learning Management System

A four-role learning platform: courses and lessons, student enrollment with progress
tracking, auto-graded MCQ quizzes, a blog with draft/publish, and an admin panel.

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | Next.js | Vercel |
| Backend / CMS | Strapi 5 | Railway |

```
LMS-project/
  backend/     Strapi 5 (TypeScript) - API, data model, role-based access control
  frontend/    Next.js 16 (App Router) - public site, auth, role-aware dashboard
```

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

Created by the seed when `SEED_DEMO_DATA=true`. Password for all of them is `SEED_PASSWORD`
from `.env` (`Passw0rd!23` by default).

| Role | Email | Can do |
|---|---|---|
| Admin | `admin@lms.test` | Everything, including user roles and platform stats |
| Content Manager | `cm@lms.test` | Any course, any lesson, any quiz, the blog |
| Instructor | `instructor@lms.test` | Their own courses only |
| Student | `student@lms.test` | Enroll, learn, take quizzes (starts at 40% on one course) |
| Student | `student2@lms.test` | A second student, enrolled in nothing |

Seeded content: three published courses (one with no quiz), one unpublished course, one
published blog post and one draft.

### Verifying it works

```bash
npm run smoke
```

Logs in as each role and walks the whole permission matrix — 80 checks covering what each
role may and may not do, the progress arithmetic, quiz grading, and the two leak paths that
matter (quiz answers, blog drafts). Everything should read `PASS`.

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

Two Playwright suites run against a live backend and a running frontend:

```bash
python frontend/scripts/browser-test.py          # public pages, auth, all four roles
python frontend/scripts/browser-test-student.py  # lessons, progress, quiz
```

They assert behaviour rather than pixels: that a lesson body never appears on a public
page, that the quiz HTML contains no answer key, that progress survives a reload, and that
a non-student cannot open the player.

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

Dark-first. Tokens live in `src/app/globals.css` and nothing hard-codes a colour.

The accent is split in two deliberately: `--accent` is a fill that always carries
`--accent-ink-on` text, and `--accent-text` is the accent used *as* text, which is bright
lime on dark and a deep olive on light. Splitting them means an unreadable pairing cannot
be assembled by picking the wrong utility.

Three radii, no others. Mono numerals and small uppercase labels are reserved for data,
never used as a heading eyebrow.

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
**Part 4 - staff dashboards + deployment** - CRUD UIs, blog editor, admin panel, Vercel + Railway

---

## Environment variables (backend)

| Variable | Purpose |
|---|---|
| `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY` | Strapi secrets — regenerate for every environment |
| `JWT_EXPIRES_IN` | How long a login lasts (default `7d`) |
| `DATABASE_CLIENT`, `DATABASE_FILENAME` | Local SQLite |
| `DATABASE_URL` | Set by Railway; its presence switches the app to Postgres |
| `FRONTEND_URL` | Comma-separated origins allowed through CORS |
| `SEED_DEMO_DATA`, `SEED_PASSWORD` | Demo seed on boot - leave off in production |

## Environment variables (frontend)

| Variable | Purpose |
|---|---|
| `STRAPI_URL` | Origin of the Strapi API. Server-side only; it is never sent to the browser |
