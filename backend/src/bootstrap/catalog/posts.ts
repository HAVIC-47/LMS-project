import type { PostSeed } from './types';

/**
 * Fifteen posts.
 *
 * Thirteen published and two left as drafts, because a blog where everything is live
 * cannot demonstrate that drafts stay private — and that guarantee is enforced in the
 * controller, not by hiding a link, so it deserves something to actually test against.
 *
 * Authorship is split between the admin and the content manager: the permission matrix
 * gives blog access to exactly those two roles, and a blog written entirely by one of them
 * would not show that.
 */
export const POSTS: PostSeed[] = [
  {
    title: 'Why we count finished lessons, not opened ones',
    slug: 'why-we-count-finished-lessons',
    excerpt: 'A progress bar that moves when you open a page is measuring curiosity, not learning.',
    body: 'Almost every learning platform has a progress bar, and almost all of them lie a little. Counting a lesson as done because it was opened rewards scrolling. Counting minutes rewards leaving a tab open.\n\nWe count one thing: lessons a student has explicitly marked complete. It is a deliberate action, it is reversible, and it is recomputed on the server from the stored records rather than trusted from the client. That last part matters more than it sounds — a percentage the browser can set is a percentage that means nothing.\n\nThe cost is that the bar moves less often. The benefit is that when it says 60%, nine lessons of fifteen are genuinely behind you.',
    authorEmail: 'cm@lms.test',
    publish: true,
  },
  {
    title: 'Sequential lessons are a teaching decision, not a lock',
    slug: 'sequential-lessons-are-a-teaching-decision',
    excerpt: 'Ordering exists because the fourth lesson assumes the third. It is not a paywall.',
    body: 'When lessons unlock in order, some students read it as an artificial gate. It is worth being clear about why the order exists: each lesson is written assuming the previous ones happened. Explaining closures before scope means explaining the same thing twice, badly.\n\nThe rule is enforced on the server, because a rule that only exists in the interface is not a rule. But it is a teaching structure rather than a restriction — an instructor sets the order, and the order is the course.\n\nWhere a course genuinely has independent modules, the right fix is to model them as separate courses rather than to weaken the sequence.',
    authorEmail: 'cm@lms.test',
    publish: false,
  },
  {
    title: 'What we look for in a first engineering hire',
    slug: 'what-we-look-for-in-a-first-hire',
    excerpt: 'Not the number of frameworks. The ability to explain a decision.',
    body: 'The strongest early-career engineers we work with have one habit in common: they can say why they built something the way they did, and what they would change now.\n\nTooling is learnable and it turns over anyway. The habit of holding a decision up and examining it is harder to teach and it transfers to every stack.\n\nIn practice this shows up in small ways. A commit message that explains a constraint. A pull request that says what was considered and rejected. A candidate who answers "why did you use that" with a reason rather than with "it is what the tutorial did".',
    authorEmail: 'admin@lms.test',
    publish: true,
  },
  {
    title: 'Permissions belong on the server',
    slug: 'permissions-belong-on-the-server',
    excerpt: 'Hiding a button changes the interface. It does not change what someone is allowed to do.',
    body: 'The most common access-control bug is not exotic. An endpoint checks that you are signed in and forgets to check that the record is yours. The interface never offers the link, so nobody notices, until someone changes a number in a URL.\n\nThis platform enforces its four roles in three layers: the permission grid decides which role may call an endpoint at all, route policies decide whether this particular caller may act on this particular record, and the controllers re-check ownership after loading the entity so a crafted query parameter cannot slip past.\n\nThree layers sounds like belt and braces. It is really an admission that any single layer will eventually be edited by someone who did not know what it was load-bearing for.',
    authorEmail: 'admin@lms.test',
    publish: true,
  },
  {
    title: 'The quiz answer key never leaves the server',
    slug: 'the-quiz-answer-key-never-leaves-the-server',
    excerpt: 'If the correct index is in the response, the quiz is decorative.',
    body: 'A multiple-choice quiz is only meaningful if the answers are not in the payload. That constraint shaped the data model: questions are a collection type rather than a component, because components serialise wholesale and would carry the correct index along with everything else.\n\nBeing a separate type means the student-facing read can strip one field before the response is built. Grading then happens in a single pure function on the server, which takes the stored questions and the submitted answers and returns a score.\n\nPure because it is the piece most worth testing directly, and the piece we would most regret getting subtly wrong.',
    authorEmail: 'cm@lms.test',
    publish: true,
  },
  {
    title: 'Drafts that are actually private',
    slug: 'drafts-that-are-actually-private',
    excerpt: 'A draft filtered out in the frontend is a draft anyone can fetch.',
    body: 'Draft and published is one of those features that looks trivial and quietly is not. The easy version filters unpublished posts in the page component. The API underneath still returns them, so the draft is one query parameter away from being public.\n\nHere the controller pins anonymous and non-editorial callers to published status before the query runs. There is no parameter to append, because the caller never gets to choose.\n\nThe test for this is worth writing even though it feels obvious: fetch the blog list with no credentials and assert the draft is absent. It is the kind of guarantee that breaks silently during a refactor.',
    authorEmail: 'cm@lms.test',
    publish: true,
  },
  {
    title: 'Notes on grading, and what a score is for',
    slug: 'notes-on-grading',
    excerpt: 'A stored attempt is more useful than a number on a screen that disappears.',
    body: 'Instant feedback is the point of an auto-graded quiz — the moment of submitting is when a student most wants to know. But a score that only exists on screen is a score that cannot be looked at later.\n\nEvery attempt is stored with the answers given, the count correct, the total, the percentage and whether it passed. That makes two things possible: a student can see their own history, and an instructor can see where a cohort collectively went wrong.\n\nThe second is the more interesting one. A question that eighty percent of students get wrong is usually a badly worded question, not eighty percent of students being wrong.',
    authorEmail: 'admin@lms.test',
    publish: true,
  },
  {
    title: 'Why the enrollment check is not a boolean on the user',
    slug: 'why-enrollment-is-not-a-boolean',
    excerpt: 'Modelling the relationship as a record makes the questions you will ask later answerable.',
    body: 'Enrollment could have been a list of course ids on the user. It is a record instead, with a student, a course and a timestamp.\n\nThe extra table pays for itself the first time somebody asks when people enrolled, or how many enrolled in a course last month, or whether a student who unenrolled should keep their progress. None of those are answerable from an array of ids.\n\nStrapi has no composite unique constraint, so the "already enrolled" case is guarded in the service with a find-then-create rather than by the database. That is a compromise worth naming out loud rather than leaving for someone to discover.',
    authorEmail: 'admin@lms.test',
    publish: true,
  },
  {
    title: 'Reading a course before you build it',
    slug: 'reading-a-course-before-you-build-it',
    excerpt: 'Fifteen lessons is a structure, not a length. Here is how we break one up.',
    body: 'A course of fifteen lessons is really five groups of three. Each group establishes one idea, applies it, and then shows where it breaks down — and each group ends with a checkpoint quiz, so a student finds out they misunderstood something three lessons in rather than fourteen.\n\nThe alternative, one long quiz at the end, tests memory of lesson one rather than understanding of it.\n\nWriting to that shape also disciplines the material. If a group of three cannot produce four honest questions, the group is usually padding.',
    authorEmail: 'cm@lms.test',
    publish: true,
  },
  {
    title: 'Uploads, and the surprising part of accepting a file',
    slug: 'uploads-and-the-surprising-part',
    excerpt: 'The upload is easy. Deciding what may be uploaded, and by whom, is the work.',
    body: 'Letting an editor pick a cover image from their own machine takes an afternoon. Doing it safely takes longer, and none of the extra time goes into the upload itself.\n\nThe type is validated against an allowlist by content rather than by filename. The size is capped before the body is read rather than after. The request goes through a server route so the API token stays on the server and never reaches the browser. And the stored URL is absolute, so it still resolves when the frontend and the backend are on different hosts.\n\nThat last one sounds like a detail. It is the one that breaks in production and works perfectly on a laptop.',
    authorEmail: 'cm@lms.test',
    publish: true,
  },
  {
    title: 'A notification is a promise to interrupt someone',
    slug: 'a-notification-is-a-promise',
    excerpt: 'The hard part is not delivery. It is deciding what deserves to be sent.',
    body: 'Once a notification system exists there is enormous pressure to notify about everything. Every event becomes a candidate, and the inbox becomes noise that people learn to dismiss without reading — at which point the one message that mattered is dismissed too.\n\nThree rules keep this one honest. Never notify someone about their own action. Never send the same thing twice to the same person. And never let a failed notification break the action that caused it — the enrollment succeeding matters more than the notice about it.\n\nWhat remains is a small set of things another person did that genuinely affect you.',
    authorEmail: 'admin@lms.test',
    publish: true,
  },
  {
    title: 'Comments, replies and the moderation you owe',
    slug: 'comments-replies-and-moderation',
    excerpt: 'Opening a comment box is a commitment to reading it.',
    body: 'Discussion under a post is genuinely valuable — a question asked in public is answered once and read a hundred times. But a comment box is not a feature you ship and walk away from.\n\nThe implementation details matter less than the commitment. Replies are one level deep rather than arbitrarily nested, because deep threads become unreadable on a phone. Authorship is server-derived rather than taken from the request, since a client-supplied author is not an author. And deletion is available to the writer and to staff.\n\nIf you are not going to read them, do not open them. An abandoned comment section is worse than none.',
    authorEmail: 'cm@lms.test',
    publish: true,
  },
  {
    title: 'Draft: instructor onboarding checklist',
    slug: 'draft-instructor-onboarding-checklist',
    excerpt: 'Internal working notes. Not for publication until the flow is finalised.',
    body: 'Working outline for what a new instructor needs in their first week. Covers account creation and role assignment by an admin, the studio walkthrough, expectations for lesson length, and the review step before a course is published.\n\nStill missing the section on video hosting and the guidance on quiz difficulty. Do not publish until both are written and the flow has been tested end to end with someone who has not seen it before.',
    authorEmail: 'admin@lms.test',
    publish: false,
  },
  {
    title: 'The three numbers we watch',
    slug: 'the-three-numbers-we-watch',
    excerpt: 'Enrollments start things. Completion is the one that means anything.',
    body: 'It is easy to build a dashboard nobody acts on. We watch three numbers.\n\nCompletion rate per course, because a course that nobody finishes has a problem in it and usually at a specific lesson. Quiz pass rate per question, because a single question everyone fails is a wording bug. And time from enrollment to first completed lesson, because the gap between signing up and starting is where most people quietly leave.\n\nThe first two are course quality. The third is onboarding. Confusing them leads to rewriting good material when the actual problem was that nobody got to it.',
    authorEmail: 'admin@lms.test',
    publish: true,
  },
  {
    title: 'Shipping this on Vercel and Railway',
    slug: 'shipping-this-on-vercel-and-railway',
    excerpt: 'Two platforms, two environments, and the variables that have to point at each other.',
    body: 'The frontend runs on Vercel and the backend on Railway with Postgres, which means two sets of environment variables that have to agree.\n\nThe frontend needs the backend URL, and the backend needs the frontend origin for CORS and for links inside notifications. Getting one of them wrong produces a site that works locally and fails on deploy — usually as a CORS error that looks like an authentication problem.\n\nThe database driver is the other classic. SQLite locally and Postgres in production means the Postgres client has to be a real dependency, not something assumed present. It is a one-line mistake that only ever shows up at boot on the platform.',
    authorEmail: 'admin@lms.test',
    publish: true,
  },
];
