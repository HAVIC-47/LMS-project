import type { CourseSeed } from '../types';

export const designingHttpApis: CourseSeed = {
  title: 'Designing HTTP APIs',
  slug: 'designing-http-apis',
  level: 'intermediate',
  description:
    'Resources, status codes, versioning and errors. How to design an interface other teams can use without reading your source, and change without breaking theirs.',
  isPublished: true,
  ownerEmail: 'instructor@lms.test',
  lessons: [
    {
      title: 'Resources, not procedures',
      contentType: 'text',
      body: 'A URL names a thing; the method says what to do with it. `POST /users/17/deactivate` is a procedure wearing a URL — `POST /users/17/deactivation` names the resource being created. The distinction matters because methods have defined semantics and invented verbs do not.',
    },
    {
      title: 'Methods and their guarantees',
      contentType: 'text',
      body: 'GET is safe — it must not change anything, because caches and crawlers will call it. PUT and DELETE are idempotent: repeating them lands in the same state. POST is neither, which is why a retried POST can create two records.',
    },
    {
      title: 'Status codes that carry information',
      contentType: 'text',
      body: '201 with a Location header says where the new thing lives. 204 says done, nothing to send. 409 says the request was valid but conflicts with current state. Returning 200 for everything moves all the meaning into the body and forces every client to parse it.',
    },
    {
      title: '400 versus 401 versus 403 versus 404',
      contentType: 'text',
      body: '400 the request is malformed, 401 you are not authenticated, 403 you are authenticated but not allowed, 404 it does not exist — or you may not know that it does. Returning 404 instead of 403 is a deliberate choice to avoid leaking existence.',
    },
    {
      title: 'Designing the error body',
      contentType: 'text',
      body: 'One shape for every error, always: a stable machine-readable code, a human message, and field-level detail for validation. Clients branch on the code, so it must not change even when the wording does.',
    },
    {
      title: 'Validation at the edge',
      contentType: 'text',
      body: 'Validate once, at the boundary, and reject with everything wrong at the same time rather than the first problem found. A client that has to submit five times to discover five errors will be blamed on your API.',
    },
    {
      title: 'Pagination',
      contentType: 'text',
      body: 'Offset pagination is simple and drifts: rows inserted during paging cause skipped and repeated items. Cursor pagination is stable under writes because it names a position in the ordering rather than a count of rows to discard.',
    },
    {
      title: 'Filtering, sorting and the sprawl problem',
      contentType: 'text',
      body: 'Every filter you accept is a query someone will run, and an index you may owe. Publish a small explicit set rather than a general query language, and validate that sort fields are on an allowlist — otherwise sorting becomes an injection surface.',
    },
    {
      title: 'Idempotency keys',
      contentType: 'text',
      body: 'For POSTs that must not happen twice, let the client supply a key and store the result against it. A retry after a timeout then returns the original response instead of charging the card again. This is the standard fix for the unreliable-network case.',
    },
    {
      title: 'Authentication and authorisation are different',
      contentType: 'text',
      body: 'Authentication establishes who is calling; authorisation decides what they may do. Authorisation belongs on the server for every request — hiding a button changes the UI, not the permission, and anyone can call the endpoint directly.',
    },
    {
      title: 'Tokens, cookies and where to put them',
      contentType: 'text',
      body: 'A token in `localStorage` is readable by any script that runs on the page, so one XSS is a full account takeover. An httpOnly cookie is not script-readable, at the cost of needing CSRF protection — which is a narrower, better understood problem.',
    },
    {
      title: 'Versioning without freezing the design',
      contentType: 'text',
      body: 'Add fields freely; removing or renaming one is the breaking change. Version the whole API only when the model itself changes shape, and treat every version you publish as something you will support for years.',
    },
    {
      title: 'Caching and conditional requests',
      contentType: 'text',
      body: '`Cache-Control` states how long a response may be reused. `ETag` plus `If-None-Match` lets a client re-validate cheaply and get a 304 with no body — the highest-leverage change available for a read-heavy endpoint.',
    },
    {
      title: 'Rate limiting that clients can cooperate with',
      contentType: 'text',
      body: 'Return 429 with `Retry-After` and publish the limit in headers, so a well-behaved client can back off before being cut off. A limit that is invisible until it fires is indistinguishable from an outage.',
    },
    {
      title: 'Documenting the contract',
      contentType: 'text',
      body: 'A generated schema that lives beside the code stays true; a hand-written page drifts within a sprint. Document the error codes and the pagination contract too — those are what integrators actually get wrong.',
    },
  ],
  quizzes: [
    {
      title: 'Checkpoint 1 — Resources and methods',
      description: 'Naming, safety and idempotency.',
      passingScore: 60,
      questions: [
        {
          prompt: 'What makes GET "safe"?',
          options: [
            'It is encrypted',
            'It must not change server state',
            'It cannot be cached',
            'It requires authentication',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Which method is NOT idempotent?',
          options: ['GET', 'PUT', 'DELETE', 'POST'],
          correctIndex: 3,
        },
        {
          prompt: '`POST /users/17/deactivate` is criticised because:',
          options: [
            'It is too long',
            'It is a procedure in a URL rather than a named resource',
            'POST cannot be used on subpaths',
            'It should be a GET',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'A 201 response should normally include:',
          options: [
            'A Retry-After header',
            'A Location header pointing at the new resource',
            'An empty body only',
            'A 204 in the body',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 2 — Errors',
      description: 'Status code choice and error payload design.',
      passingScore: 60,
      questions: [
        {
          prompt: 'Authenticated but not permitted is:',
          options: ['400', '401', '403', '404'],
          correctIndex: 2,
        },
        {
          prompt: 'Returning 404 rather than 403 is sometimes chosen to:',
          options: [
            'Simplify the client',
            'Avoid leaking that the resource exists',
            'Enable caching',
            'Satisfy REST',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'The part of an error body clients branch on must be:',
          options: [
            'The human message',
            'A stable machine-readable code',
            'The HTTP status alone',
            'The timestamp',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Validation should return:',
          options: [
            'The first error found',
            'Everything wrong at once',
            'A 500',
            'A redirect',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 3 — Collections',
      description: 'Pagination, filtering and safe retries.',
      passingScore: 60,
      questions: [
        {
          prompt: 'Offset pagination drifts because:',
          options: [
            'Offsets are slow',
            'Rows inserted while paging cause skipped and repeated items',
            'It cannot be sorted',
            'It requires an index',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Cursor pagination is stable because it names:',
          options: [
            'A page number',
            'A position in the ordering',
            'A row count',
            'A timestamp only',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Sort fields should be checked against an allowlist because otherwise sorting becomes:',
          options: [
            'Slower',
            'An injection surface',
            'Non-deterministic',
            'Uncacheable',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'An idempotency key lets a retried POST:',
          options: [
            'Run twice safely',
            'Return the original response instead of acting again',
            'Skip authentication',
            'Bypass rate limits',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 4 — Access control',
      description: 'Authn vs authz, and where credentials live.',
      passingScore: 60,
      questions: [
        {
          prompt: 'Authorisation must be enforced:',
          options: [
            'In the UI by hiding controls',
            'On the server, on every request',
            'Once at login',
            'By the CDN',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'A token in localStorage is risky because:',
          options: [
            'It expires quickly',
            'Any script on the page can read it, so one XSS is account takeover',
            'It cannot be sent to APIs',
            'Browsers clear it randomly',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'The trade-off of an httpOnly cookie is that it:',
          options: [
            'Cannot be used cross-origin at all',
            'Needs CSRF protection',
            'Is readable by scripts',
            'Cannot expire',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Which change is breaking?',
          options: [
            'Adding an optional field',
            'Renaming an existing field',
            'Adding a new endpoint',
            'Adding a header',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Final — Operating the API',
      description: 'Caching, limits and documentation.',
      passingScore: 70,
      questions: [
        {
          prompt: '`ETag` with `If-None-Match` lets the server return:',
          options: ['204', '304 with no body', '404', '412 always'],
          correctIndex: 1,
        },
        {
          prompt: 'A 429 response is most cooperative when it includes:',
          options: ['A stack trace', '`Retry-After`', 'A redirect', 'An ETag'],
          correctIndex: 1,
        },
        {
          prompt: 'A rate limit that is invisible until it fires is:',
          options: [
            'Best practice',
            'Indistinguishable from an outage to the client',
            'Required by HTTP',
            'Only a problem for browsers',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Documentation stays accurate mainly when it is:',
          options: [
            'Reviewed quarterly',
            'Generated from a schema that lives beside the code',
            'Written by a technical writer',
            'Published as PDF',
          ],
          correctIndex: 1,
        },
      ],
    },
  ],
};
