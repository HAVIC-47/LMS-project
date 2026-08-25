import type { CourseSeed } from '../types';

export const reactRenderingAndState: CourseSeed = {
  title: 'React: Rendering and State',
  slug: 'react-rendering-and-state',
  level: 'intermediate',
  description:
    'Why a component re-rendered, where state should live, and which problems effects are actually for. The mental model that makes the hooks rules stop feeling like trivia.',
  isPublished: true,
  ownerEmail: 'instructor@lms.test',
  lessons: [
    {
      title: 'Rendering is calling your function',
      contentType: 'text',
      body: 'A render is React calling your component to get a description of the UI. It is not a DOM update — that is the commit that may follow. Separating the two explains why a render can be cheap and frequent, and why "re-rendered" is not the same as "repainted".',
    },
    {
      title: 'State is a snapshot',
      contentType: 'text',
      body: 'The state value in a render never changes during that render. Setting state schedules another render with a new value; it does not mutate the current one. This is why reading state immediately after setting it gives the old number, and why the updater form exists.',
    },
    {
      title: 'Why a component re-rendered',
      contentType: 'text',
      body: 'Three reasons only: its own state changed, its parent re-rendered, or a context it consumes changed. Props changing is not a fourth — props change because the parent re-rendered.',
    },
    {
      title: 'Keys and list identity',
      contentType: 'text',
      body: 'A key tells React which item is which between renders. Using an array index means deleting the first item makes every remaining key shift, so React reuses the wrong DOM node and the state inside it goes to the wrong row. Use a stable id from the data.',
    },
    {
      title: 'Lifting state, and putting it back down',
      contentType: 'text',
      body: 'State belongs at the lowest common ancestor of the components that need it. Lifting it higher than that makes the whole subtree re-render for a change only one leaf cares about — and the fix is usually to move the state back down, not to add memoisation.',
    },
    {
      title: 'Derived state is a smell',
      contentType: 'text',
      body: 'If a value can be computed from props and state during render, compute it during render. Storing it in a second `useState` and syncing it with an effect creates two sources of truth and one frame where they disagree.',
    },
    {
      title: 'What effects are actually for',
      contentType: 'text',
      body: 'An effect synchronises with something outside React: a subscription, a timer, a browser API, a network resource. It is not a lifecycle hook and it is not the place for logic that could run during render or in an event handler.',
    },
    {
      title: 'The dependency array, honestly',
      contentType: 'text',
      body: 'The array is not a list of when to run — it is a list of everything the effect reads. Removing a dependency to stop a loop does not fix the loop, it hides a stale closure. Fix the cause: move the value inside, or make it stable.',
    },
    {
      title: 'Cleanup functions',
      contentType: 'text',
      body: 'The returned function runs before the next effect and on unmount. Every subscription, timer and listener needs one, and an in-flight fetch needs an ignore flag or an AbortController so a late response cannot write into an unmounted component.',
    },
    {
      title: 'Event handlers vs effects',
      contentType: 'text',
      body: 'If something should happen because the user did a specific thing, it belongs in the handler. If it should happen because the component is on screen in a particular state, it belongs in an effect. Sending analytics on click from an effect is the classic misfiling.',
    },
    {
      title: 'Memoisation: useMemo, useCallback, memo',
      contentType: 'text',
      body: 'All three trade memory and complexity for skipped work. They only pay off when the skipped work is genuinely expensive or when a stable reference is required downstream. Wrapping everything by default makes code harder to read and measurably slower to render.',
    },
    {
      title: 'Context and the re-render it causes',
      contentType: 'text',
      body: 'Every consumer re-renders when the context value changes, and an object literal in the provider is a new value on every render. Split rarely-changing context from frequently-changing context rather than putting the whole app state in one provider.',
    },
    {
      title: 'useReducer for related state',
      contentType: 'text',
      body: 'When several pieces of state always change together, a reducer keeps the transitions in one place and makes the illegal intermediate combinations impossible. It also moves the update logic out of the component, where it can be tested directly.',
    },
    {
      title: 'Refs: escape hatch, not storage',
      contentType: 'text',
      body: 'A ref holds a mutable value that survives renders without causing one. That makes it right for a DOM node, a timer id or a previous value — and wrong for anything the UI displays, because changing it will not update the screen.',
    },
    {
      title: 'Controlled and uncontrolled inputs',
      contentType: 'text',
      body: 'A controlled input takes its value from state and re-renders on every keystroke. An uncontrolled one keeps its value in the DOM and is read on submit. Controlled is right when you need to react to each character; uncontrolled is usually right for a plain form.',
    },
  ],
  quizzes: [
    {
      title: 'Checkpoint 1 — The render model',
      description: 'What a render is, and why state behaves like a snapshot.',
      passingScore: 60,
      questions: [
        {
          prompt: 'A render is:',
          options: [
            'A DOM update',
            'React calling your component to get a description of the UI',
            'A repaint by the browser',
            'A network request',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Reading state immediately after calling the setter gives the old value because:',
          options: [
            'The setter is asynchronous over the network',
            'State is a snapshot fixed for the current render',
            'React batches DOM writes',
            'The value is memoised',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Which is NOT one of the reasons a component re-renders?',
          options: [
            'Its own state changed',
            'Its parent re-rendered',
            'A context it consumes changed',
            'Its props changed on their own',
          ],
          correctIndex: 3,
        },
        {
          prompt: 'Using an array index as a key breaks when:',
          options: [
            'The list is long',
            'Items are inserted or removed, shifting every later key',
            'The list is sorted once',
            'Keys are numbers',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 2 — Where state lives',
      description: 'Lifting, deriving, and the cost of putting state too high.',
      passingScore: 60,
      questions: [
        {
          prompt: 'State belongs at:',
          options: [
            'The root of the app',
            'The lowest common ancestor of the components that need it',
            'The component that renders most often',
            'A global store, always',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'A whole subtree re-rendering for a change only one leaf cares about is usually fixed by:',
          options: [
            'Wrapping everything in memo',
            'Moving the state back down',
            'Adding a context',
            'Using a ref',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'A value that can be computed from props and state should be:',
          options: [
            'Stored in useState and synced with an effect',
            'Computed during render',
            'Kept in a ref',
            'Cached in context',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'The problem with mirroring a prop into state is:',
          options: [
            'It is slower',
            'Two sources of truth, with a frame where they disagree',
            'It breaks keys',
            'Effects cannot read props',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 3 — Effects',
      description: 'What effects are for, dependencies, and cleanup.',
      passingScore: 60,
      questions: [
        {
          prompt: 'An effect is for:',
          options: [
            'Reacting to lifecycle events',
            'Synchronising with something outside React',
            'Computing derived values',
            'Replacing event handlers',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'The dependency array is a list of:',
          options: [
            'When the effect should run',
            'Everything the effect reads',
            'State setters used inside',
            'Props to ignore',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Removing a dependency to stop an infinite loop:',
          options: [
            'Fixes the loop correctly',
            'Hides a stale closure instead of fixing the cause',
            'Is required by the linter',
            'Improves performance',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'An in-flight fetch inside an effect needs cleanup so that:',
          options: [
            'The request is faster',
            'A late response cannot write into an unmounted component',
            'The dependency array can be empty',
            'React can batch it',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 4 — Performance and context',
      description: 'Memoisation that pays for itself, and context re-renders.',
      passingScore: 60,
      questions: [
        {
          prompt: 'Wrapping every value in useMemo by default:',
          options: [
            'Is the recommended baseline',
            'Adds complexity and can make rendering measurably slower',
            'Removes the need for keys',
            'Prevents all re-renders',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'An object literal as a context value causes:',
          options: [
            'A type error',
            'Every consumer to re-render on every provider render',
            'The context to be ignored',
            'Automatic memoisation',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Sending analytics when a button is clicked belongs in:',
          options: ['An effect', 'The event handler', 'A ref callback', 'A reducer'],
          correctIndex: 1,
        },
        {
          prompt: 'useReducer is a good fit when:',
          options: [
            'There is exactly one boolean',
            'Several pieces of state always change together',
            'The value never changes',
            'You need a DOM node',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Final — Refs and forms',
      description: 'The escape hatch, and how inputs hold their value.',
      passingScore: 70,
      questions: [
        {
          prompt: 'A ref is the wrong tool for:',
          options: [
            'Holding a DOM node',
            'Storing a timer id',
            'Anything the UI displays',
            'Keeping a previous value',
          ],
          correctIndex: 2,
        },
        {
          prompt: 'Changing `ref.current`:',
          options: [
            'Triggers a re-render',
            'Does not cause a render',
            'Throws in strict mode',
            'Schedules an effect',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'A controlled input:',
          options: [
            'Keeps its value in the DOM',
            'Takes its value from state and re-renders on each keystroke',
            'Cannot be validated',
            'Requires a ref',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'For a plain form read only on submit, the simpler choice is:',
          options: ['Controlled', 'Uncontrolled', 'Context', 'A reducer'],
          correctIndex: 1,
        },
      ],
    },
  ],
};
