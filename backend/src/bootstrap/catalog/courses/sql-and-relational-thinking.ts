import type { CourseSeed } from '../types';

export const sqlAndRelationalThinking: CourseSeed = {
  title: 'SQL and Relational Thinking',
  slug: 'sql-and-relational-thinking',
  level: 'beginner',
  description:
    'Joins, grouping, indexes and transactions. How to model data so the queries stay simple, and how to read a query plan when they do not.',
  isPublished: true,
  ownerEmail: 'cm@lms.test',
  lessons: [
    {
      title: 'Tables, rows and the relational idea',
      contentType: 'text',
      body: 'A table is a set of rows with the same shape, and a relation between tables is expressed by storing a key rather than nesting data. That single constraint is what makes arbitrary queries possible later, without knowing in advance how the data will be asked for.',
    },
    {
      title: 'Primary keys and foreign keys',
      contentType: 'text',
      body: 'A primary key identifies a row uniquely and never changes. A foreign key is a promise that a value exists in another table, enforced by the database rather than by application code — which is the difference between an invariant and a hope.',
    },
    {
      title: 'The order clauses actually run in',
      contentType: 'text',
      body: 'SQL is written SELECT-first but evaluated FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT. That order explains why a column alias defined in SELECT cannot be used in WHERE, and why HAVING exists at all.',
    },
    {
      title: 'Filtering, and what NULL does to it',
      contentType: 'text',
      body: 'NULL means unknown, so any comparison with it is unknown rather than false. `WHERE status != \'done\'` silently drops rows where status is NULL, and `= NULL` never matches — `IS NULL` is the only test that works.',
    },
    {
      title: 'Inner joins',
      contentType: 'text',
      body: 'An inner join keeps rows that match on both sides. If a join unexpectedly multiplies your row count, the join key is not unique on one side — that is duplication, not a bug in the database.',
    },
    {
      title: 'Outer joins and when you need them',
      contentType: 'text',
      body: 'A LEFT JOIN keeps every row from the left table and fills the right with NULLs when nothing matches. Putting a condition on the right table in WHERE instead of ON quietly turns it back into an inner join.',
    },
    {
      title: 'Aggregates and GROUP BY',
      contentType: 'text',
      body: 'GROUP BY collapses rows into one per group, and every selected column must either be grouped or aggregated. `COUNT(*)` counts rows; `COUNT(column)` skips NULLs — a distinction that changes reports more often than people expect.',
    },
    {
      title: 'HAVING versus WHERE',
      contentType: 'text',
      body: 'WHERE filters rows before grouping; HAVING filters groups after. Filtering in WHERE where possible is both clearer and cheaper, because fewer rows ever reach the grouping step.',
    },
    {
      title: 'Subqueries and CTEs',
      contentType: 'text',
      body: 'A common table expression names a subquery and puts it at the top, so a query reads as a sequence of steps rather than an inside-out nest. Same result, dramatically better to review — and easy to test one step at a time.',
    },
    {
      title: 'Window functions',
      contentType: 'text',
      body: 'A window function computes across a set of rows without collapsing them, so you can have both the row and its rank, running total or group average. `ROW_NUMBER() OVER (PARTITION BY … ORDER BY …)` is the standard way to take the latest row per group.',
    },
    {
      title: 'Indexes: what they cost and what they buy',
      contentType: 'text',
      body: 'An index is a sorted structure that turns a scan into a lookup. It is paid for on every insert, update and delete, so an index nothing queries is pure overhead — and an index on a low-cardinality column often will not be used at all.',
    },
    {
      title: 'Reading a query plan',
      contentType: 'text',
      body: '`EXPLAIN` shows how the database intends to answer. Look for a sequential scan on a large table, a nested loop over many rows, and any estimate that is wildly different from reality — the last usually means statistics are stale.',
    },
    {
      title: 'The N+1 problem',
      contentType: 'text',
      body: 'One query for a list plus one per item is the most common performance failure in application code. Fix it by joining, or by fetching the children in a single `WHERE id IN (…)` and grouping in memory.',
    },
    {
      title: 'Transactions and isolation',
      contentType: 'text',
      body: 'A transaction makes a group of statements all-or-nothing. Isolation level decides what one transaction can see of another mid-flight; the defaults differ between engines, which is why "it worked on SQLite" is not evidence it works on Postgres.',
    },
    {
      title: 'Migrations without downtime',
      contentType: 'text',
      body: 'Add columns as nullable, backfill in batches, then add the constraint. Deploy code that tolerates both shapes before the shape changes — a migration and the code that needs it should never require the same instant.',
    },
  ],
  quizzes: [
    {
      title: 'Checkpoint 1 — Structure and keys',
      description: 'Relations, keys, and the order a query is evaluated.',
      passingScore: 60,
      questions: [
        {
          prompt: 'A foreign key differs from an application-level check because it is:',
          options: [
            'Faster to write',
            'Enforced by the database, so it cannot be bypassed',
            'Optional at write time',
            'Stored in a separate table',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Which clause is evaluated first?',
          options: ['SELECT', 'FROM', 'ORDER BY', 'HAVING'],
          correctIndex: 1,
        },
        {
          prompt: 'A column alias defined in SELECT cannot be used in WHERE because:',
          options: [
            'Aliases are only for display',
            'WHERE is evaluated before SELECT',
            'Aliases must be quoted',
            'WHERE does not support expressions',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'A primary key should:',
          options: [
            'Change when the row changes',
            'Identify the row uniquely and never change',
            'Be human readable',
            'Be nullable',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 2 — NULL and joins',
      description: 'Three-valued logic and the join that quietly became inner.',
      passingScore: 60,
      questions: [
        {
          prompt: '`WHERE status != \'done\'` will:',
          options: [
            'Include rows where status is NULL',
            'Silently exclude rows where status is NULL',
            'Throw an error on NULL',
            'Treat NULL as an empty string',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'The only reliable test for a NULL value is:',
          options: ['`= NULL`', '`IS NULL`', '`== NULL`', '`COALESCE`'],
          correctIndex: 1,
        },
        {
          prompt: 'A join that unexpectedly multiplies the row count means:',
          options: [
            'The database is misconfigured',
            'The join key is not unique on one side',
            'An index is missing',
            'The tables are too large',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Putting a condition on the right table in WHERE rather than ON turns a LEFT JOIN into:',
          options: ['A cross join', 'An inner join', 'A full outer join', 'A self join'],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 3 — Grouping and windows',
      description: 'Aggregates, HAVING, CTEs and window functions.',
      passingScore: 60,
      questions: [
        {
          prompt: 'The difference between `COUNT(*)` and `COUNT(column)` is that the second:',
          options: [
            'Is faster',
            'Skips NULLs',
            'Counts distinct values',
            'Requires a GROUP BY',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'HAVING filters:',
          options: ['Rows before grouping', 'Groups after grouping', 'Columns', 'Indexes'],
          correctIndex: 1,
        },
        {
          prompt: 'A window function differs from an aggregate because it:',
          options: [
            'Is always faster',
            'Computes across rows without collapsing them',
            'Cannot be ordered',
            'Only works on numbers',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'The standard way to take the latest row per group is:',
          options: [
            '`LIMIT 1` with `ORDER BY`',
            '`ROW_NUMBER() OVER (PARTITION BY … ORDER BY …)`',
            '`DISTINCT`',
            '`GROUP BY` alone',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 4 — Performance',
      description: 'Indexes, plans and the N+1 problem.',
      passingScore: 60,
      questions: [
        {
          prompt: 'An index that nothing queries is:',
          options: [
            'Free',
            'Pure overhead, paid on every write',
            'Useful for backups',
            'Automatically dropped',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'In a query plan, a wildly wrong row estimate usually means:',
          options: [
            'The query is invalid',
            'Statistics are stale',
            'The index is corrupt',
            'The table is locked',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'The N+1 problem is:',
          options: [
            'One query per column',
            'One query for a list plus one per item',
            'Too many joins',
            'A missing primary key',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'A reasonable fix for N+1 is:',
          options: [
            'Add an index to every column',
            'Fetch children in one `WHERE id IN (…)` and group in memory',
            'Increase the connection pool',
            'Cache the list',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Final — Transactions and change',
      description: 'Atomicity, isolation and shipping a migration safely.',
      passingScore: 70,
      questions: [
        {
          prompt: 'A transaction guarantees that a group of statements:',
          options: [
            'Runs faster',
            'All succeed or none do',
            'Runs on one connection',
            'Bypasses constraints',
          ],
          correctIndex: 1,
        },
        {
          prompt: '"It worked on SQLite" is weak evidence for Postgres mainly because:',
          options: [
            'Postgres is slower',
            'Default isolation levels and concurrency behaviour differ',
            'SQLite has no SQL',
            'Postgres ignores indexes',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'The safe order for adding a required column is:',
          options: [
            'Add it NOT NULL immediately',
            'Add nullable, backfill in batches, then add the constraint',
            'Drop and recreate the table',
            'Add it in the same deploy as the code that requires it',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Code should tolerate both schema shapes because:',
          options: [
            'Migrations are optional',
            'A migration and the deploy that needs it never happen at the same instant',
            'Rollbacks are impossible',
            'It improves query speed',
          ],
          correctIndex: 1,
        },
      ],
    },
  ],
};
