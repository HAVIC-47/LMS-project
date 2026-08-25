import type { CourseSeed } from '../types';

export const webSecurityEssentials: CourseSeed = {
  title: 'Web Security Essentials',
  slug: 'web-security-essentials',
  level: 'advanced',
  description:
    'The vulnerability classes that actually reach production: injection, XSS, broken access control, and the session mistakes that undo everything else.',
  isPublished: true,
  ownerEmail: 'cm@lms.test',
  lessons: [
    {
      title: 'Thinking in trust boundaries',
      contentType: 'text',
      body: 'A trust boundary is any point where data crosses from somewhere you do not control to somewhere you do. Nearly every vulnerability is data crossing one without being checked — so drawing the boundaries is the first step, before any specific defence.',
    },
    {
      title: 'Broken access control',
      contentType: 'text',
      body: 'The most common serious flaw in web applications, and the least exotic: an endpoint that checks you are logged in but not that the record is yours. Changing an id in a URL is not an attack technique, it is typing — the server has to decide, on every request.',
    },
    {
      title: 'Enforce on the server, always',
      contentType: 'text',
      body: 'Hiding a button changes the interface, not the permission. Any client-side control is a convenience for honest users; the check that matters runs where the attacker has no vote, which is the server.',
    },
    {
      title: 'SQL injection and how parameters fix it',
      contentType: 'text',
      body: 'Injection happens when data is concatenated into a command so the parser reads it as syntax. Parameterised queries send the query and the values separately, so there is no string for an attacker to escape out of. Escaping by hand is a losing game.',
    },
    {
      title: 'Cross-site scripting',
      contentType: 'text',
      body: 'XSS is injection into HTML: attacker-controlled text becomes markup or script in someone else\'s session. Context matters — escaping for HTML text is not sufficient inside an attribute, a URL, or a script block.',
    },
    {
      title: 'Output encoding and dangerous sinks',
      contentType: 'text',
      body: 'Frameworks escape interpolated text by default, and every XSS in a modern app goes through the escape hatch: `innerHTML`, `dangerouslySetInnerHTML`, an unsanitised markdown renderer, or a `javascript:` URL that was never validated.',
    },
    {
      title: 'Content Security Policy',
      contentType: 'text',
      body: 'CSP restricts where scripts may load from and whether inline script may run at all. It is defence in depth: it does not remove the bug, it reduces what an attacker can do with it — which is exactly what you want when the bug is the one you missed.',
    },
    {
      title: 'CSRF, and why cookies invite it',
      contentType: 'text',
      body: 'Browsers attach cookies to requests the site did not initiate, so a form on another origin can act as the victim. `SameSite=Lax` blocks the usual cross-site POST, and a per-session token confirms the request came from your own page.',
    },
    {
      title: 'Session management',
      contentType: 'text',
      body: 'Sessions need expiry, rotation on privilege change, and revocation. A long-lived token that cannot be revoked means a leak is permanent until it expires — rotating the session id on login also closes session fixation.',
    },
    {
      title: 'Storing passwords',
      contentType: 'text',
      body: 'Use a slow, salted, memory-hard hash — bcrypt, scrypt or Argon2 — never a general-purpose fast digest. Speed is the enemy here: a fast hash is a fast offline cracking loop for whoever takes the database.',
    },
    {
      title: 'Handling secrets',
      contentType: 'text',
      body: 'Secrets belong in the environment, never in the repository, and a secret that has been committed is burned even after the commit is removed — history is public. Rotation, not deletion, is the fix.',
    },
    {
      title: 'Dependency risk',
      contentType: 'text',
      body: 'Most of the code you ship was written by strangers. Lockfiles pin what you audited, automated advisories tell you when a pin becomes dangerous, and every new dependency is a permanent decision to trust a maintainer you have not met.',
    },
    {
      title: 'File uploads',
      contentType: 'text',
      body: 'Validate type by content rather than by filename, cap the size before reading, store outside the web root, and serve with a fixed content type. A user-supplied filename should never become a path.',
    },
    {
      title: 'Rate limiting and enumeration',
      contentType: 'text',
      body: 'Login, password reset and signup all leak information through their responses and their timing. Identical messages and identical latency for "no such user" and "wrong password" are what stop an attacker mapping your user base.',
    },
    {
      title: 'Logging without leaking',
      contentType: 'text',
      body: 'Logs need enough to reconstruct an incident and nothing that would make the logs themselves a breach. Tokens, passwords, full card numbers and session ids do not belong there — and error responses sent to users should never carry a stack trace.',
    },
  ],
  quizzes: [
    {
      title: 'Checkpoint 1 — Access control',
      description: 'Trust boundaries and the most common serious flaw.',
      passingScore: 60,
      questions: [
        {
          prompt: 'An endpoint that verifies you are logged in but not that the record is yours is:',
          options: [
            'Correct if the UI hides the link',
            'Broken access control',
            'A CSRF issue',
            'Acceptable for GET requests',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Hiding a button in the UI:',
          options: [
            'Enforces the permission',
            'Changes the interface, not the permission',
            'Is sufficient with HTTPS',
            'Prevents direct API calls',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'A trust boundary is:',
          options: [
            'The firewall',
            'Any point where data crosses from outside your control to inside it',
            'The login page',
            'The database connection',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Changing an id in a URL to see someone else\'s record is best described as:',
          options: [
            'An advanced exploit',
            'Typing — which is why the server must decide on every request',
            'A browser bug',
            'Impossible over HTTPS',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 2 — Injection',
      description: 'SQL injection, XSS and dangerous sinks.',
      passingScore: 60,
      questions: [
        {
          prompt: 'Parameterised queries prevent injection because they:',
          options: [
            'Escape quotes automatically',
            'Send the query and the values separately, so data is never parsed as syntax',
            'Encrypt the query',
            'Validate input types',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Escaping for HTML text is insufficient inside:',
          options: [
            'A paragraph',
            'An attribute, a URL, or a script block',
            'A heading',
            'A comment only',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'In a modern framework, XSS almost always arrives via:',
          options: [
            'Normal interpolation',
            'An escape hatch such as innerHTML or an unsanitised renderer',
            'Server-side rendering',
            'CSS',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'A CSP is best understood as:',
          options: [
            'A replacement for output encoding',
            'Defence in depth that limits what an attacker can do with a bug you missed',
            'A firewall rule',
            'A cookie flag',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 3 — Sessions',
      description: 'CSRF, session lifecycle and password storage.',
      passingScore: 60,
      questions: [
        {
          prompt: 'CSRF is possible because browsers:',
          options: [
            'Cache responses',
            'Attach cookies to requests the site did not initiate',
            'Allow cross-origin reads',
            'Ignore SameSite',
          ],
          correctIndex: 1,
        },
        {
          prompt: '`SameSite=Lax` primarily blocks:',
          options: [
            'XSS',
            'The usual cross-site POST',
            'SQL injection',
            'Clickjacking',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Rotating the session id on login prevents:',
          options: ['Session fixation', 'XSS', 'CSRF', 'Enumeration'],
          correctIndex: 0,
        },
        {
          prompt: 'Passwords should be hashed with an algorithm that is deliberately:',
          options: ['Fast', 'Slow and memory-hard', 'Reversible', 'Unsalted'],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 4 — Supply chain and secrets',
      description: 'Committed secrets, dependencies and uploads.',
      passingScore: 60,
      questions: [
        {
          prompt: 'A secret committed to a public repository is:',
          options: [
            'Safe once the commit is removed',
            'Burned — history is public, so it must be rotated',
            'Safe if the repo is later made private',
            'Only a problem if it is a password',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'A lockfile helps security because it:',
          options: [
            'Encrypts dependencies',
            'Pins exactly what you audited',
            'Blocks new packages',
            'Scans for malware',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Upload type should be validated by:',
          options: ['The filename extension', 'The content', 'The Content-Type header alone', 'File size'],
          correctIndex: 1,
        },
        {
          prompt: 'A user-supplied filename must never become:',
          options: ['A display label', 'A path', 'A database column', 'An alt attribute'],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Final — Operating securely',
      description: 'Enumeration, timing and logging.',
      passingScore: 70,
      questions: [
        {
          prompt: 'Login should return identical messages for "no such user" and "wrong password" to prevent:',
          options: ['CSRF', 'User enumeration', 'XSS', 'Injection'],
          correctIndex: 1,
        },
        {
          prompt: 'Response timing matters because it can leak:',
          options: [
            'The server version',
            'Whether an account exists',
            'The database engine',
            'The session id',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Which must NOT be written to logs?',
          options: [
            'Request path',
            'Session ids and tokens',
            'Status code',
            'Duration',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'A stack trace returned to the user is a problem because it:',
          options: [
            'Is slow to render',
            'Reveals internal structure to an attacker',
            'Breaks caching',
            'Violates CSP',
          ],
          correctIndex: 1,
        },
      ],
    },
  ],
};
