import type { CourseSeed } from '../types';

export const gitForTeams: CourseSeed = {
  title: 'Git for Teams',
  slug: 'git-for-teams',
  level: 'beginner',
  description:
    'Commits, branches, rebases and the recovery commands. What Git is actually storing, so that merges and mistakes both stop being frightening.',
  isPublished: true,
  ownerEmail: 'cm@lms.test',
  lessons: [
    {
      title: 'What a commit actually is',
      contentType: 'text',
      body: 'A commit is a full snapshot of the tree plus a pointer to its parent — not a diff. Diffs are computed between snapshots when you ask for them. Once that lands, branching and merging stop looking like magic and start looking like pointer arithmetic.',
    },
    {
      title: 'The three areas',
      contentType: 'text',
      body: 'The working tree is your files, the index is what will go into the next commit, and HEAD is the last commit on the current branch. Almost every confusing Git message is about a disagreement between two of those three.',
    },
    {
      title: 'Branches are labels',
      contentType: 'text',
      body: 'A branch is a movable pointer to a commit — a file containing a hash. That is why creating one is instant and why deleting a branch does not delete commits: it removes a label, and the commits stay until garbage collection.',
    },
    {
      title: 'Writing a commit message worth reading',
      contentType: 'text',
      body: 'The subject line says what changed; the body says why. Six months later nobody can recover the reasoning from the diff, and the diff already shows the what — so a body explaining the constraint you were under is the valuable half.',
    },
    {
      title: 'Staging deliberately',
      contentType: 'text',
      body: '`git add -p` walks changes hunk by hunk, which lets an unrelated fix become its own commit instead of riding along inside a feature. Commits that do one thing are what make history reviewable and reverts safe.',
    },
    {
      title: 'Merge versus rebase',
      contentType: 'text',
      body: 'Merge preserves what happened and creates a merge commit. Rebase rewrites your commits onto a new base, producing a straight line at the cost of new hashes. Rebase your own unpublished work; merge anything others have pulled.',
    },
    {
      title: 'Resolving a conflict',
      contentType: 'text',
      body: 'A conflict is Git declining to guess. Read both sides, decide what the code should be — which is often neither side verbatim — then stage the file to mark it resolved. `git checkout --ours` and `--theirs` are shortcuts, not decisions.',
    },
    {
      title: 'Interactive rebase',
      contentType: 'text',
      body: 'Squash the "fix typo" commits, reorder, split, and reword before opening the pull request. History is a document you are writing for reviewers, and cleaning it up before publishing is courtesy rather than dishonesty.',
    },
    {
      title: 'The reflog is your safety net',
      contentType: 'text',
      body: 'The reflog records where HEAD has been, including states no branch points at any more. A bad reset or rebase is recoverable by finding the previous position and resetting back to it — almost nothing is genuinely lost until garbage collection runs.',
    },
    {
      title: 'reset, revert, restore',
      contentType: 'text',
      body: '`reset` moves the branch pointer, `restore` changes files, `revert` records a new commit undoing an old one. Revert is the only one safe on shared history, because it adds rather than rewrites.',
    },
    {
      title: 'Stashing, and why to be careful',
      contentType: 'text',
      body: 'A stash parks changes without committing. It is easy to forget one and easy to pop it onto the wrong branch — a throwaway branch with a real commit is usually a better parking spot for anything you might keep.',
    },
    {
      title: 'Remotes and tracking branches',
      contentType: 'text',
      body: '`origin/main` is your last-known copy of the remote, updated by `fetch`, not by `status`. `pull` is `fetch` plus a merge or rebase — separating them makes it clear what you are integrating before you integrate it.',
    },
    {
      title: 'Force pushing without hurting anyone',
      contentType: 'text',
      body: '`--force-with-lease` refuses to overwrite work that appeared since your last fetch, where plain `--force` overwrites it silently. On a shared branch, prefer neither.',
    },
    {
      title: 'Finding when something broke',
      contentType: 'text',
      body: '`git bisect` binary-searches the history against a test, and `git log -S` finds the commit where a string appeared or vanished. Both beat reading a year of diffs, and both reward small, single-purpose commits.',
    },
    {
      title: 'A workflow that survives contact',
      contentType: 'text',
      body: 'Short-lived branches, small pull requests, rebase before opening, merge into the trunk. The failure mode of long-lived branches is not conflicts — it is that review becomes impossible and gets rubber-stamped.',
    },
  ],
  quizzes: [
    {
      title: 'Checkpoint 1 — The object model',
      description: 'Commits, the three areas, and what a branch is.',
      passingScore: 60,
      questions: [
        {
          prompt: 'A commit stores:',
          options: [
            'A diff against its parent',
            'A full snapshot of the tree plus a parent pointer',
            'Only the changed files',
            'A patch file',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'The index is:',
          options: [
            'Your working files',
            'What will go into the next commit',
            'The remote copy',
            'The reflog',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Deleting a branch:',
          options: [
            'Deletes its commits immediately',
            'Removes a label; the commits remain until garbage collection',
            'Requires a force push',
            'Rewrites history',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Creating a branch is instant because a branch is:',
          options: [
            'A copy of the working tree',
            'A movable pointer to a commit',
            'A compressed archive',
            'A remote reference',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 2 — Committing well',
      description: 'Messages, staging, and single-purpose commits.',
      passingScore: 60,
      questions: [
        {
          prompt: 'The most valuable part of a commit message body is:',
          options: [
            'What changed',
            'Why it changed',
            'Who changed it',
            'The file list',
          ],
          correctIndex: 1,
        },
        {
          prompt: '`git add -p` is used to:',
          options: [
            'Add all files',
            'Stage changes hunk by hunk',
            'Push to a remote',
            'Preview a merge',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Commits that do one thing make which operation safe?',
          options: ['Fetch', 'Revert', 'Clone', 'Stash'],
          correctIndex: 1,
        },
        {
          prompt: 'A single-commit push is a poor signal in review because:',
          options: [
            'It is slower to clone',
            'It hides how the work was actually built up',
            'It breaks bisect entirely',
            'It cannot be merged',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 3 — Integrating work',
      description: 'Merge, rebase, and conflicts.',
      passingScore: 60,
      questions: [
        {
          prompt: 'Rebase produces new hashes because it:',
          options: [
            'Compresses objects',
            'Rewrites the commits onto a new base',
            'Deletes the originals',
            'Changes the author',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'The rule of thumb is:',
          options: [
            'Always rebase',
            'Rebase unpublished work; merge anything others have pulled',
            'Always merge',
            'Rebase shared branches only',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'A conflict means Git:',
          options: [
            'Found a syntax error',
            'Is declining to guess between two changes',
            'Lost a commit',
            'Needs a force push',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'The correct resolution of a conflict is:',
          options: [
            'Always take ours',
            'Whatever the code should be, often neither side verbatim',
            'Always take theirs',
            'Delete the file',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 4 — Undo',
      description: 'reflog, reset, revert and force pushing.',
      passingScore: 60,
      questions: [
        {
          prompt: 'The reflog records:',
          options: [
            'Every file change',
            'Where HEAD has been, including unreferenced states',
            'Remote activity only',
            'Merge conflicts',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Which is safe on shared history?',
          options: ['reset --hard', 'revert', 'rebase', 'push --force'],
          correctIndex: 1,
        },
        {
          prompt: '`--force-with-lease` differs from `--force` because it:',
          options: [
            'Is faster',
            'Refuses to overwrite work that appeared since your last fetch',
            'Skips hooks',
            'Creates a backup branch',
          ],
          correctIndex: 1,
        },
        {
          prompt: '`origin/main` is updated by:',
          options: ['status', 'fetch', 'commit', 'add'],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Final — Investigation and workflow',
      description: 'Finding regressions and keeping branches short.',
      passingScore: 70,
      questions: [
        {
          prompt: '`git bisect` works by:',
          options: [
            'Reading commit messages',
            'Binary-searching history against a test',
            'Comparing branches',
            'Scanning the reflog',
          ],
          correctIndex: 1,
        },
        {
          prompt: '`git log -S` finds:',
          options: [
            'Commits by author',
            'The commit where a string appeared or vanished',
            'Signed commits',
            'Stashes',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'The real failure mode of long-lived branches is:',
          options: [
            'Disk usage',
            'Review becomes impossible and gets rubber-stamped',
            'Slower CI',
            'Lost stashes',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'A stash is a risky parking spot mainly because:',
          options: [
            'It compresses badly',
            'It is easy to forget, and easy to pop onto the wrong branch',
            'It cannot hold new files',
            'It rewrites history',
          ],
          correctIndex: 1,
        },
      ],
    },
  ],
};
