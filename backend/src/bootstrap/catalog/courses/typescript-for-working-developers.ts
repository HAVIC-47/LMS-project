import type { CourseSeed } from '../types';

export const typescriptForWorkingDevelopers: CourseSeed = {
  title: 'TypeScript for Working Developers',
  slug: 'typescript-for-working-developers',
  level: 'intermediate',
  description:
    'Types as a design tool rather than a chore. Narrowing, generics, and how to describe data so that the illegal states stop being representable.',
  isPublished: true,
  ownerEmail: 'instructor@lms.test',
  lessons: [
    {
      title: 'What the compiler actually checks',
      contentType: 'text',
      body: 'TypeScript erases entirely at build time: there is no runtime check, no type information in the output, and no cost in the shipped bundle. Everything it gives you happens before the code runs, which is also why data arriving from a network call is only typed by assertion, not by verification.',
    },
    {
      title: 'Inference, and when to annotate',
      contentType: 'text',
      body: 'Annotate the boundaries — function parameters, exported returns, module edges — and let inference handle the inside. Annotating a local that the compiler already knows adds noise and, worse, can widen a type that inference had pinned precisely.',
    },
    {
      title: 'Unions and narrowing',
      contentType: 'text',
      body: 'A union says a value is one of several shapes. Narrowing is how you get from the union to one member: `typeof`, `in`, an equality check, or a custom predicate. The compiler tracks these along control flow, so an early `return` genuinely narrows the rest of the function.',
    },
    {
      title: 'Discriminated unions',
      contentType: 'text',
      body: 'Give every member of a union a shared literal field — `kind`, `status`, `type` — and a single switch narrows the whole object. This is the main tool for making illegal states unrepresentable: a "loading" case simply has no `data` field to read.',
    },
    {
      title: 'Literal types and `as const`',
      contentType: 'text',
      body: 'A string literal type is a set of exactly one value. `as const` freezes an object or array into literal types instead of widening them to `string` or `string[]`, which is what lets a config object drive a union elsewhere.',
    },
    {
      title: 'Interfaces, type aliases and when it matters',
      contentType: 'text',
      body: 'They overlap almost completely. Interfaces merge across declarations, which is useful for augmenting library types and a hazard everywhere else; aliases do not merge and can express unions and mapped types. Default to `type` and reach for `interface` when you need declaration merging.',
    },
    {
      title: 'Generics without the fear',
      contentType: 'text',
      body: 'A generic parameter is an argument the caller supplies in type position. Reach for one only when a type must flow from input to output — if the parameter appears exactly once in the signature, it is doing nothing and a plain type is clearer.',
    },
    {
      title: 'Constraints and defaults',
      contentType: 'text',
      body: '`extends` on a generic restricts what may be substituted, which is what lets the body use a property at all. A default type parameter keeps a flexible API from forcing every caller to spell out the common case.',
    },
    {
      title: 'Utility types worth knowing',
      contentType: 'text',
      body: '`Pick`, `Omit`, `Partial`, `Required`, `Record` and `ReturnType` cover most day-to-day reshaping. Deriving a type from an existing one — rather than writing a parallel copy — is what stops the two drifting apart when the source changes.',
    },
    {
      title: 'Typing an API response honestly',
      contentType: 'text',
      body: 'An annotation on a `fetch` result is a promise you are making to the compiler, not a check. If the shape matters, validate at the boundary and let the validated type flow inward — that way one runtime check buys compile-time safety everywhere downstream.',
    },
    {
      title: '`unknown`, `any` and `never`',
      contentType: 'text',
      body: '`any` switches checking off and spreads silently through everything it touches. `unknown` is the honest version: it accepts anything but forces a narrowing before use. `never` is the empty type, and it is how an exhaustive switch proves at compile time that no case was missed.',
    },
    {
      title: 'Type guards and predicates',
      contentType: 'text',
      body: 'A function returning `value is Thing` teaches the compiler what a runtime check proved. The compiler takes the claim at face value, so a wrong predicate is worse than no predicate — it launders a bad assumption into a trusted type.',
    },
    {
      title: 'Strict mode, one flag at a time',
      contentType: 'text',
      body: '`strict` is a bundle. On an existing codebase, enabling `strictNullChecks` alone usually surfaces the majority of real bugs, and it is tractable to fix in stages. Turning the whole bundle on at once tends to produce a diff nobody can review.',
    },
    {
      title: 'Declaration files and third-party types',
      contentType: 'text',
      body: 'A `.d.ts` describes shape with no implementation. When a library ships its own types they win; when it does not, `@types/*` fills the gap, and when both are wrong, module augmentation lets you patch the type locally rather than casting at every call site.',
    },
    {
      title: 'Reading a compiler error',
      contentType: 'text',
      body: 'Long errors are usually a nested mismatch printed outward. Read from the bottom, where the actual incompatible pair is named, then walk up to see which position it sat in. The top line is context, not the cause.',
    },
  ],
  quizzes: [
    {
      title: 'Checkpoint 1 — The type system\'s remit',
      description: 'What is checked, when, and where annotations belong.',
      passingScore: 60,
      questions: [
        {
          prompt: 'What does TypeScript add to the JavaScript it emits?',
          options: [
            'Runtime type checks',
            'Nothing — types are erased at build time',
            'A schema validator',
            'A wrapper around every function',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Where are annotations most worth writing?',
          options: [
            'On every local variable',
            'At boundaries: parameters, exported returns, module edges',
            'Only inside function bodies',
            'Nowhere — inference handles all of it',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Narrowing a union means:',
          options: [
            'Removing members from the declaration',
            'Using a runtime check to reach one member of the union',
            'Casting with `as`',
            'Making the type smaller in memory',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Annotating a local the compiler already inferred can:',
          options: [
            'Speed up compilation',
            'Widen a type inference had pinned precisely',
            'Enable strict mode',
            'Create a runtime check',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 2 — Modelling data',
      description: 'Discriminated unions, literals and declaration style.',
      passingScore: 60,
      questions: [
        {
          prompt: 'What makes a union "discriminated"?',
          options: [
            'It has fewer than five members',
            'Every member shares a literal field that identifies it',
            'It is declared with `interface`',
            'All members have the same fields',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Modelling a loading state so it simply has no `data` field is an example of:',
          options: [
            'Making illegal states unrepresentable',
            'Structural typing',
            'Declaration merging',
            'Type erasure',
          ],
          correctIndex: 0,
        },
        {
          prompt: 'What does `as const` do to an object literal?',
          options: [
            'Freezes it at runtime',
            'Gives its properties literal types instead of widening them',
            'Marks it readonly only in strict mode',
            'Converts it to an interface',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'The main practical difference between `interface` and `type` is:',
          options: [
            'Interfaces are faster',
            'Interfaces merge across declarations; type aliases do not',
            'Only types can describe objects',
            'Interfaces cannot be exported',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 3 — Generics',
      description: 'When a generic earns its place, and how to constrain it.',
      passingScore: 60,
      questions: [
        {
          prompt: 'A generic parameter that appears only once in a signature is usually:',
          options: [
            'Correctly used',
            'Doing nothing — a plain type would be clearer',
            'Required for inference',
            'A constraint',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'What does `extends` do on a generic parameter?',
          options: [
            'Creates a subclass',
            'Restricts what may be substituted, so the body can rely on those members',
            'Sets a default',
            'Marks it optional',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Deriving a type with `Pick` or `Omit` rather than writing a copy prevents:',
          options: [
            'Slow compilation',
            'The two definitions drifting apart when the source changes',
            'Runtime errors',
            'Circular imports',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'A default type parameter is useful because it:',
          options: [
            'Makes the type nullable',
            'Keeps a flexible API from forcing every caller to spell out the common case',
            'Improves inference at runtime',
            'Replaces constraints',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 4 — Honest types',
      description: 'unknown vs any, predicates, and typing the network boundary.',
      passingScore: 60,
      questions: [
        {
          prompt: 'Annotating the result of `fetch` as your response type is:',
          options: [
            'A runtime check',
            'A promise to the compiler that nothing verifies',
            'Equivalent to schema validation',
            'Rejected under strict mode',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'The difference between `unknown` and `any` is that `unknown`:',
          options: [
            'Accepts fewer values',
            'Accepts anything but forces a narrowing before use',
            'Is only valid in declaration files',
            'Disables strict mode',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'A predicate returning `value is Thing` is dangerous when wrong because it:',
          options: [
            'Throws at runtime',
            'Launders a bad assumption into a type the compiler then trusts',
            'Disables narrowing everywhere',
            'Breaks tree shaking',
          ],
          correctIndex: 1,
        },
        {
          prompt: '`never` is most useful for:',
          options: [
            'Marking optional fields',
            'Proving at compile time that a switch is exhaustive',
            'Typing empty arrays',
            'Replacing `void`',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Final — Adopting it on a real codebase',
      description: 'Strictness, third-party types and reading errors.',
      passingScore: 70,
      questions: [
        {
          prompt: 'On an existing codebase, the single flag that surfaces the most real bugs is usually:',
          options: ['noImplicitAny', 'strictNullChecks', 'noUnusedLocals', 'exactOptionalPropertyTypes'],
          correctIndex: 1,
        },
        {
          prompt: 'A `.d.ts` file contains:',
          options: [
            'Compiled JavaScript',
            'Type declarations with no implementation',
            'Test fixtures',
            'Build configuration',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'When a library\'s published types are wrong, the better fix is:',
          options: [
            'Cast with `as any` at every call site',
            'Augment the module locally so the correction lives in one place',
            'Fork the library',
            'Disable type checking for the file',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'A long nested compiler error is best read:',
          options: [
            'Top down — the first line is the cause',
            'From the bottom, where the actual incompatible pair is named',
            'By line count',
            'Only in the editor tooltip',
          ],
          correctIndex: 1,
        },
      ],
    },
  ],
};
