# LMS — Learning Management System

A four-role learning platform: courses and lessons, student enrollment with progress
tracking, auto-graded MCQ quizzes, a blog with draft/publish, and an admin panel.

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | Next.js | Vercel |
| Backend / CMS | Strapi 5 | Railway |

```
LMS/
  backend/     Strapi 5 (TypeScript) — API, data model, role-based access control
  frontend/    Next.js — coming in Part 2
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

**Part 2 — Next.js foundation** — design system, cookie session auth, public pages
**Part 3 — student experience** — My Courses, lesson viewer, progress UI, quiz runner
**Part 4 — staff dashboards + deployment** — CRUD UIs, admin panel, blog editor, Vercel + Railway

---

## Environment variables (backend)

| Variable | Purpose |
|---|---|
| `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY` | Strapi secrets — regenerate for every environment |
| `JWT_EXPIRES_IN` | How long a login lasts (default `7d`) |
| `DATABASE_CLIENT`, `DATABASE_FILENAME` | Local SQLite |
| `DATABASE_URL` | Set by Railway; its presence switches the app to Postgres |
| `FRONTEND_URL` | Comma-separated origins allowed through CORS |
| `SEED_DEMO_DATA`, `SEED_PASSWORD` | Demo seed on boot — leave off in production |
