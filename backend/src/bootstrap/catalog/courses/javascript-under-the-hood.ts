import type { CourseSeed } from '../types';

export const javascriptUnderTheHood: CourseSeed = {
  title: 'JavaScript Under the Hood',
  slug: 'javascript-under-the-hood',
  level: 'intermediate',
  description:
    'Scope, closures, prototypes and the event loop. Not a tour of syntax — the model underneath it, so the behaviour that used to look arbitrary starts being predictable.',
  isPublished: true,
  ownerEmail: 'instructor@lms.test',
  lessons: [
    {
      title: 'Values, bindings and scope',
      contentType: 'text',
      body: 'A binding is a name pointing at a value, not a box holding one. `let` and `const` are scoped to the nearest block; `var` is scoped to the nearest function, which is why a `var` declared inside an `if` is visible after it. `const` freezes the binding, never the value — a `const` array can still be pushed to.',
    },
    {
      title: 'Hoisting and the temporal dead zone',
      contentType: 'text',
      body: 'Declarations are registered before any code runs. A `var` is registered and initialised to `undefined`; a `let` or `const` is registered but left uninitialised, and touching it before its declaration throws a ReferenceError. That gap is the temporal dead zone, and it exists so a typo fails loudly instead of silently reading `undefined`.',
    },
    {
      title: 'Closures in practice',
      contentType: 'text',
      body: 'A closure is a function together with the scope it was created in. It is how a callback still knows about a variable whose function returned long ago. The classic loop bug — every callback logging the same number — is a `var` sharing one binding across iterations, which `let` fixes by creating a fresh binding each time.',
    },
    {
      title: '`this` and how it is decided',
      contentType: 'text',
      body: '`this` is set by how a function is called, not where it is written. Called as a method it is the object before the dot; called bare it is `undefined` in strict mode; called with `new` it is the fresh object. Arrow functions have no `this` of their own and read the enclosing one, which is why they work as callbacks and fail as methods.',
    },
    {
      title: 'Prototypes and the class keyword',
      contentType: 'text',
      body: 'Every object has a link to another object, its prototype, and a property miss walks that chain until it hits `null`. `class` is syntax over exactly that: methods land on `Prototype.prototype` and are shared by every instance, rather than copied into each one.',
    },
    {
      title: 'The call stack',
      contentType: 'text',
      body: 'Calling a function pushes a frame; returning pops it. The stack is why a runtime error can tell you the route taken to reach it, and why unbounded recursion ends in a stack overflow rather than running forever.',
    },
    {
      title: 'The event loop, visually',
      contentType: 'video',
      videoUrl: 'https://www.youtube.com/watch?v=8aGhZQkoFbQ',
    },
    {
      title: 'Microtasks and macrotasks',
      contentType: 'text',
      body: 'After the stack empties the loop drains the whole microtask queue before taking a single macrotask. Promise callbacks are microtasks, `setTimeout` is a macrotask, and that ordering is why a resolved promise logs before a `setTimeout(…, 0)` scheduled earlier.',
    },
    {
      title: 'Promises from the inside',
      contentType: 'text',
      body: 'A promise is a value that is not there yet, in one of three states, and it settles once. `.then` registers a callback and returns a new promise, which is what makes chaining work. Returning a promise from inside `.then` adopts it instead of nesting it.',
    },
    {
      title: 'async/await and error handling',
      contentType: 'text',
      body: '`await` does not make code synchronous. It suspends the surrounding function and hands control back to the loop, resuming when the promise settles. A rejection surfaces as a thrown error, so `try`/`catch` works — but an un-awaited call leaves the rejection unhandled, which is the most common async bug in review.',
    },
    {
      title: 'Iterators and generators',
      contentType: 'text',
      body: 'Anything with a `Symbol.iterator` method works with `for…of` and spread. A generator is the easy way to write one: `yield` pauses the function and keeps its local state, so a sequence can be produced lazily rather than built up front.',
    },
    {
      title: 'Modules: ESM and CommonJS',
      contentType: 'text',
      body: 'ES module imports are static — the dependency graph is known before execution, which is what makes tree shaking possible. CommonJS `require` is a function call resolved at runtime, so a bundler cannot prove which exports are unused.',
    },
    {
      title: 'Equality, coercion and the parts to avoid',
      contentType: 'text',
      body: '`===` compares without converting; `==` converts first, following a table nobody remembers correctly. The one defensible use of `==` is `x == null`, which catches both `null` and `undefined`. Everything else is clearer written out.',
    },
    {
      title: 'References, copies and garbage collection',
      contentType: 'text',
      body: 'Objects are passed by reference, so a function that mutates its argument changes the caller\'s object. Memory is reclaimed when a value is no longer reachable from a root — which is why a forgotten listener or a growing cache leaks: it is still reachable, so it is not garbage.',
    },
    {
      title: 'Reading a stack trace',
      contentType: 'text',
      body: 'Read a trace top down: the first line is where it threw, the rest is how execution got there. Frames from `node_modules` are usually noise between your call and the failure — find the topmost frame in your own code and start there.',
    },
  ],
  quizzes: [
    {
      title: 'Checkpoint 1 — Bindings and scope',
      description: 'Scope, hoisting and closures, from the first three lessons.',
      passingScore: 60,
      questions: [
        {
          prompt: 'Which declaration is scoped to the nearest enclosing block?',
          options: ['var', 'let', 'function', 'None of them'],
          correctIndex: 1,
        },
        {
          prompt: 'Reading a `let` binding before its declaration throws because of:',
          options: [
            'The temporal dead zone',
            'Strict mode',
            'Automatic semicolon insertion',
            'The prototype chain',
          ],
          correctIndex: 0,
        },
        {
          prompt: 'A `for` loop creating callbacks that all log the same final number is caused by:',
          options: [
            '`let` creating one binding per iteration',
            '`var` sharing a single binding across every iteration',
            'The callbacks running before the loop',
            'Hoisting the loop body',
          ],
          correctIndex: 1,
        },
        {
          prompt: '`const numbers = [1, 2]; numbers.push(3);` — what happens?',
          options: [
            'A TypeError, because the array is const',
            'It works: `const` freezes the binding, not the value',
            'The array is silently copied',
            'A ReferenceError',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 2 — Objects, `this` and prototypes',
      description: 'How `this` is decided and what `class` actually compiles to.',
      passingScore: 60,
      questions: [
        {
          prompt: 'What determines the value of `this` in an ordinary function?',
          options: [
            'Where the function was written',
            'How the function was called',
            'The file it lives in',
            'The order of declaration',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Why does an arrow function work well as a callback but badly as a method?',
          options: [
            'It is faster to call',
            'It has no `this` of its own and reads the enclosing scope',
            'It cannot take arguments',
            'It is always bound to the global object',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Where do methods defined with `class` actually live?',
          options: [
            'Copied onto every instance',
            'On the prototype, shared by all instances',
            'In a hidden global registry',
            'On the constructor function itself',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'A property lookup that misses on the object itself will:',
          options: [
            'Immediately return undefined',
            'Throw a ReferenceError',
            'Walk the prototype chain until it reaches null',
            'Search the global scope',
          ],
          correctIndex: 2,
        },
      ],
    },
    {
      title: 'Checkpoint 3 — The event loop',
      description: 'The stack, the queues, and the order things actually run in.',
      passingScore: 60,
      questions: [
        {
          prompt: 'After the call stack empties, the event loop first:',
          options: [
            'Takes one macrotask',
            'Drains the entire microtask queue',
            'Renders the page',
            'Runs pending timers in creation order',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'A promise callback and a `setTimeout(fn, 0)` are both scheduled. Which runs first?',
          options: [
            'The setTimeout, because it was scheduled with zero delay',
            'The promise callback, because microtasks drain first',
            'Whichever was written first',
            'They run in parallel',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Unbounded recursion ends in a stack overflow because:',
          options: [
            'The garbage collector cannot keep up',
            'Each call pushes a frame and none are ever popped',
            'The event loop is blocked',
            'Microtasks accumulate',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'How many times can a promise settle?',
          options: ['Once', 'Once per `.then`', 'As often as it is resolved', 'Twice at most'],
          correctIndex: 0,
        },
      ],
    },
    {
      title: 'Checkpoint 4 — Async and iteration',
      description: 'await, generators and the module system.',
      passingScore: 60,
      questions: [
        {
          prompt: 'What does `await` actually do?',
          options: [
            'Blocks the thread until the promise settles',
            'Suspends the surrounding function and returns control to the event loop',
            'Converts async code to synchronous code',
            'Runs the promise on a worker thread',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Calling an async function without awaiting it means a rejection will:',
          options: [
            'Be caught by the nearest try/catch',
            'Be silently discarded and surface as an unhandled rejection',
            'Crash immediately at the call site',
            'Retry automatically',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'What does `yield` do inside a generator?',
          options: [
            'Ends the function permanently',
            'Pauses it, preserving its local state, and produces a value',
            'Schedules a microtask',
            'Throws to the caller',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Why can ES modules be tree shaken when CommonJS generally cannot?',
          options: [
            'ES modules are smaller',
            'Imports are static, so the dependency graph is known before execution',
            'CommonJS does not support exports',
            'Bundlers only parse ESM',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Final — Language mechanics',
      description: 'Equality, references, memory and reading failures.',
      passingScore: 70,
      questions: [
        {
          prompt: 'The one broadly defensible use of `==` is:',
          options: [
            'Comparing numbers to strings',
            '`x == null`, which catches both null and undefined',
            'Comparing objects',
            'There is none',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'A function that mutates the object it was passed:',
          options: [
            'Cannot affect the caller',
            'Changes the caller\'s object, because objects are passed by reference',
            'Silently receives a deep copy',
            'Throws in strict mode',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'A cache that grows forever leaks memory because its entries are:',
          options: [
            'Too large individually',
            'Still reachable, so never collected',
            'Stored on the prototype',
            'Written to disk',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'When reading a stack trace, the most useful line is usually:',
          options: [
            'The last line',
            'The topmost frame in your own code',
            'The first node_modules frame',
            'The error name',
          ],
          correctIndex: 1,
        },
      ],
    },
  ],
};
