import type { CourseSeed } from '../types';

export const testingThatEarnsItsKeep: CourseSeed = {
  title: 'Testing That Earns Its Keep',
  slug: 'testing-that-earns-its-keep',
  level: 'intermediate',
  description:
    'What to test, what to skip, and how to write suites that catch regressions instead of cementing implementation details.',
  isPublished: true,
  ownerEmail: 'instructor@lms.test',
  lessons: [
    {
      title: 'What a test is for',
      contentType: 'text',
      body: 'A test exists to let you change code with confidence. Any test that has to be rewritten every time the implementation changes — while the behaviour stays the same — is charging rent without paying it back.',
    },
    {
      title: 'Test behaviour, not structure',
      contentType: 'text',
      body: 'Assert on what a unit produces for a given input, not on which private methods it called along the way. Tests coupled to structure fail on refactors that broke nothing, which is how a team learns to distrust its own suite.',
    },
    {
      title: 'Arrange, act, assert',
      contentType: 'text',
      body: 'Three visible sections make a test readable in seconds. If the arrange block is longer than the other two together, that is usually the design telling you the unit has too many collaborators.',
    },
    {
      title: 'Naming a test so a failure explains itself',
      contentType: 'text',
      body: 'The name should state the condition and the expected outcome. On a red CI run the name is often all anybody reads, and "returns 403 when the instructor does not own the course" beats "test course permissions" every time.',
    },
    {
      title: 'The pyramid, and where it is wrong',
      contentType: 'text',
      body: 'Many unit tests, fewer integration tests, a handful of end-to-end tests — because cost and flakiness rise as you go up. The caveat is that for a thin service most of the risk lives at the seams, so the integration layer deserves more weight than the shape suggests.',
    },
    {
      title: 'Pure functions are the cheapest thing to test',
      contentType: 'text',
      body: 'A function with no I/O needs no setup, no mocks and no cleanup. Pushing decisions into pure functions and leaving effects at the edges is a testing strategy disguised as an architecture choice.',
    },
    {
      title: 'Test doubles: stub, mock, fake, spy',
      contentType: 'text',
      body: 'A stub returns canned data, a fake is a working lightweight implementation, a spy records calls, a mock asserts on them. Mocks are the most coupling of the four, so reach for them last.',
    },
    {
      title: 'Mocking the wrong thing',
      contentType: 'text',
      body: 'Mocking your own module usually means testing that you called yourself. Mock the boundary — the network, the clock, the filesystem — and let everything inside it run for real.',
    },
    {
      title: 'Making time and randomness deterministic',
      contentType: 'text',
      body: 'Inject the clock and the random source rather than reading them globally. A test that fails at midnight or one run in fifty will be marked flaky and then ignored, taking whatever real bug it found with it.',
    },
    {
      title: 'Fixtures and factories',
      contentType: 'text',
      body: 'A factory builds a valid object and lets a test override only the field it cares about. Shared mutable fixtures create order dependence between tests, which is the hardest kind of failure to reproduce.',
    },
    {
      title: 'Testing errors and edge cases',
      contentType: 'text',
      body: 'The happy path is the one manual testing already covers. Empty lists, one item, duplicates, unicode, the boundary value and the permission denial are where the defects actually are.',
    },
    {
      title: 'Integration tests against a real database',
      contentType: 'text',
      body: 'Query behaviour, constraints and transactions cannot be verified against a mock. Run against a real engine, roll each test back in a transaction, and never share mutable state between tests.',
    },
    {
      title: 'End-to-end tests without the flake',
      contentType: 'text',
      body: 'Wait for a condition, never for a duration. `sleep` is the source of most flaky suites — a network-idle heuristic can also resolve before a client-side redirect finishes, so assert on the destination rather than the quiet.',
    },
    {
      title: 'Coverage as a signal, not a target',
      contentType: 'text',
      body: 'Coverage tells you what was executed, not what was verified. A suite can execute every line and assert almost nothing; a mandated percentage reliably produces exactly that suite.',
    },
    {
      title: 'What to do with a flaky test',
      contentType: 'text',
      body: 'Fix it or delete it, today. A retried flaky test is a suite that has learned to ignore failures, and the next real regression will slip through the same hole.',
    },
  ],
  quizzes: [
    {
      title: 'Checkpoint 1 — Purpose and shape',
      description: 'Why tests exist and how to write one that reads well.',
      passingScore: 60,
      questions: [
        {
          prompt: 'A test that must be rewritten on every refactor, with behaviour unchanged, is:',
          options: [
            'Thorough',
            'Charging rent without paying it back',
            'A good integration test',
            'Required for coverage',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'You should assert on:',
          options: [
            'Which private methods were called',
            'What the unit produces for a given input',
            'Execution time',
            'Line coverage',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'An arrange block longer than act and assert combined usually indicates:',
          options: [
            'A thorough test',
            'The unit has too many collaborators',
            'Missing fixtures',
            'A slow database',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'A good test name states:',
          options: [
            'The file under test',
            'The condition and the expected outcome',
            'The author',
            'The ticket number',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 2 — Strategy',
      description: 'The pyramid, pure functions and where risk lives.',
      passingScore: 60,
      questions: [
        {
          prompt: 'Tests get fewer toward the top of the pyramid because higher levels are:',
          options: [
            'Less important',
            'More expensive and more flaky',
            'Harder to name',
            'Not automatable',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'For a thin service, extra weight is justified at which layer?',
          options: ['Unit', 'Integration', 'End-to-end', 'Manual'],
          correctIndex: 1,
        },
        {
          prompt: 'Pure functions are cheap to test because they need no:',
          options: [
            'Assertions',
            'Setup, mocks or cleanup',
            'Naming',
            'Coverage',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Pushing decisions inward and effects to the edges is:',
          options: [
            'A testing strategy disguised as an architecture choice',
            'Only relevant to functional languages',
            'A performance optimisation',
            'Required by the pyramid',
          ],
          correctIndex: 0,
        },
      ],
    },
    {
      title: 'Checkpoint 3 — Test doubles',
      description: 'The four kinds, and what to mock.',
      passingScore: 60,
      questions: [
        {
          prompt: 'Which double asserts on the calls made to it?',
          options: ['Stub', 'Fake', 'Spy', 'Mock'],
          correctIndex: 3,
        },
        {
          prompt: 'A fake is:',
          options: [
            'Canned return data',
            'A working lightweight implementation',
            'A call recorder',
            'A failing stub',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Mocking your own module usually means:',
          options: [
            'Better isolation',
            'Testing that you called yourself',
            'Faster tests only',
            'Correct boundary design',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'The right things to mock are:',
          options: [
            'Internal helpers',
            'Boundaries: network, clock, filesystem',
            'Pure functions',
            'Data structures',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 4 — Determinism and data',
      description: 'Clocks, factories and edge cases.',
      passingScore: 60,
      questions: [
        {
          prompt: 'A test that fails one run in fifty will realistically be:',
          options: [
            'Investigated immediately',
            'Marked flaky and ignored, hiding any real bug it found',
            'Automatically fixed',
            'Removed from coverage',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Shared mutable fixtures cause:',
          options: [
            'Slower runs only',
            'Order dependence between tests',
            'Higher coverage',
            'Better isolation',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'A factory is preferable to a fixture because it:',
          options: [
            'Runs faster',
            'Builds a valid object and lets a test override only what it cares about',
            'Requires no imports',
            'Works without a database',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Defects are most often found in:',
          options: [
            'The happy path',
            'Empty lists, boundaries, duplicates and permission denials',
            'Getters',
            'Configuration files',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Final — Suites that stay trustworthy',
      description: 'Integration, end-to-end, coverage and flakes.',
      passingScore: 70,
      questions: [
        {
          prompt: 'Query behaviour and constraints must be tested against:',
          options: [
            'A mock repository',
            'A real database engine',
            'A JSON fixture',
            'The type system',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'In an end-to-end test you should wait for:',
          options: ['A duration', 'A condition', 'Network idle only', 'A fixed retry count'],
          correctIndex: 1,
        },
        {
          prompt: 'Coverage measures:',
          options: [
            'What was verified',
            'What was executed',
            'How many assertions ran',
            'Test quality',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'The correct response to a flaky test is:',
          options: [
            'Add a retry',
            'Fix it or delete it, today',
            'Increase the timeout',
            'Exclude it from CI',
          ],
          correctIndex: 1,
        },
      ],
    },
  ],
};
