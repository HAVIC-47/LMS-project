import type { CourseSeed } from '../types';

export const cssLayoutFromFirstPrinciples: CourseSeed = {
  title: 'CSS Layout from First Principles',
  slug: 'css-layout-from-first-principles',
  level: 'beginner',
  description:
    'The box model, flow, flexbox and grid — taught as one system rather than a list of tricks, so layouts stop being trial and error.',
  isPublished: true,
  ownerEmail: 'cm@lms.test',
  lessons: [
    {
      title: 'The box model, exactly',
      contentType: 'text',
      body: 'Every element is content, padding, border and margin. `box-sizing: border-box` makes a declared width include padding and border, which is why almost every stylesheet sets it globally — without it, adding padding changes the size of the box.',
    },
    {
      title: 'Normal flow',
      contentType: 'text',
      body: 'Before any layout system is applied, block elements stack down the page at full width and inline elements sit along a line. Most "broken" layouts are flow doing exactly what it should to content that was never given a layout context.',
    },
    {
      title: 'Margin collapse',
      contentType: 'text',
      body: 'Adjacent vertical margins merge into the larger of the two, and a parent with no padding or border collapses with its first child. Flex and grid containers do not collapse margins at all, which is one reason gap is easier to reason about.',
    },
    {
      title: 'Inline, block and inline-block',
      contentType: 'text',
      body: 'Inline boxes ignore width, height and vertical margins. Block boxes take the full available width. `inline-block` sits on a line but accepts box dimensions — and inherits the whitespace gap between inline items, which surprises people every time.',
    },
    {
      title: 'Flexbox: one axis at a time',
      contentType: 'text',
      body: 'Flexbox distributes space along a main axis and aligns across a cross axis. `justify-content` works on the main axis, `align-items` on the cross axis, and swapping `flex-direction` swaps which is which — that single fact resolves most flexbox confusion.',
    },
    {
      title: 'flex-grow, shrink and basis',
      contentType: 'text',
      body: '`flex-basis` is the starting size, `flex-grow` divides leftover space, `flex-shrink` divides overflow. `flex: 1` means `1 1 0%`, which makes items equal regardless of content — while `flex: auto` sizes them by content first.',
    },
    {
      title: 'Why flex items overflow',
      contentType: 'text',
      body: 'A flex item has `min-width: auto`, so it refuses to shrink below its content. A long unbroken string or a wide table then pushes the container out. `min-width: 0` on the item is the fix, and it is the single most common flexbox bug in production.',
    },
    {
      title: 'Grid: two axes at once',
      contentType: 'text',
      body: 'Grid places items into rows and columns defined on the container, so the layout is described in one place rather than emerging from the children. Use flex when content should decide the sizes, grid when the layout should.',
    },
    {
      title: 'fr, minmax and auto-fit',
      contentType: 'text',
      body: '`fr` divides leftover space after fixed tracks. `repeat(auto-fit, minmax(16rem, 1fr))` gives a responsive card grid with no media queries at all: tracks are added while they fit and collapse when they do not.',
    },
    {
      title: 'Alignment in grid',
      contentType: 'text',
      body: '`justify-*` works on the inline axis, `align-*` on the block axis; `*-items` aligns contents within their cells and `*-content` aligns the whole track set within the container. Once the naming is clear, the properties stop needing to be guessed.',
    },
    {
      title: 'Positioning: relative, absolute, sticky',
      contentType: 'text',
      body: 'An absolutely positioned element is placed against its nearest positioned ancestor, which is why `position: relative` on the parent is usually the missing piece. Sticky is flow until a scroll threshold, and it silently does nothing if an ancestor has `overflow: hidden`.',
    },
    {
      title: 'Stacking contexts and z-index',
      contentType: 'text',
      body: 'z-index only compares siblings inside the same stacking context. A transform, a filter or an opacity below 1 creates a new context, so a child can never escape it no matter how large its z-index — the usual reason a dropdown hides behind a header.',
    },
    {
      title: 'Sizing: content, available, and intrinsic keywords',
      contentType: 'text',
      body: '`min-content` is the narrowest the content allows, `max-content` the widest it wants, `fit-content` clamps between them. These describe intent directly and often replace a magic pixel value that was only ever right at one breakpoint.',
    },
    {
      title: 'Responsive without breakpoint soup',
      contentType: 'text',
      body: 'Fluid type with `clamp()`, intrinsic grids with `auto-fit`, and container queries for components that must respond to their own width rather than the viewport. Media queries are then a last resort rather than the whole strategy.',
    },
    {
      title: 'Debugging a layout methodically',
      contentType: 'text',
      body: 'Ask three questions in order: what is the display type of the parent, what is the containing block of this element, and what is its intrinsic size. Outlining every element is a fast way to see which box is actually the wrong one.',
    },
  ],
  quizzes: [
    {
      title: 'Checkpoint 1 — Boxes and flow',
      description: 'The box model, normal flow and margin behaviour.',
      passingScore: 60,
      questions: [
        {
          prompt: 'What does `box-sizing: border-box` change?',
          options: [
            'Margins are included in the width',
            'Padding and border are included in the declared width',
            'Borders are removed',
            'The element becomes a block',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Two adjacent vertical margins of 20px and 30px produce a gap of:',
          options: ['50px', '30px', '20px', '25px'],
          correctIndex: 1,
        },
        {
          prompt: 'Which properties does an inline box ignore?',
          options: [
            'Colour and font',
            'Width, height and vertical margins',
            'Padding entirely',
            'Text alignment',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Margin collapse does NOT happen inside:',
          options: ['A block container', 'A flex or grid container', 'The body', 'A section'],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 2 — Flexbox',
      description: 'Axes, the flex shorthand, and the overflow trap.',
      passingScore: 60,
      questions: [
        {
          prompt: '`justify-content` aligns items along:',
          options: ['The cross axis', 'The main axis', 'The block axis always', 'The inline axis always'],
          correctIndex: 1,
        },
        {
          prompt: '`flex: 1` expands to:',
          options: ['1 1 auto', '1 0 auto', '1 1 0%', '0 1 auto'],
          correctIndex: 2,
        },
        {
          prompt: 'A long unbroken string pushing a flex container wider is fixed by:',
          options: [
            '`overflow: hidden` on the container',
            '`min-width: 0` on the item',
            '`flex-wrap: wrap`',
            'Reducing the font size',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Changing `flex-direction` to `column`:',
          options: [
            'Has no effect on alignment properties',
            'Swaps which axis `justify-content` and `align-items` act on',
            'Disables flex-grow',
            'Forces wrapping',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 3 — Grid',
      description: 'Tracks, fr units and responsive grids.',
      passingScore: 60,
      questions: [
        {
          prompt: 'Choose grid over flex when:',
          options: [
            'Content should decide the sizes',
            'The layout should decide the sizes',
            'There is only one row',
            'You need wrapping',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'What does `fr` distribute?',
          options: [
            'The full container width',
            'Space left over after fixed tracks',
            'Padding',
            'The gap',
          ],
          correctIndex: 1,
        },
        {
          prompt: '`repeat(auto-fit, minmax(16rem, 1fr))` gives you:',
          options: [
            'A fixed three-column grid',
            'A responsive grid with no media queries',
            'One column per item always',
            'Equal-height rows only',
          ],
          correctIndex: 1,
        },
        {
          prompt: '`align-items` versus `align-content`:',
          options: [
            'Identical in grid',
            'Items aligns within cells; content aligns the whole track set in the container',
            'Content only works in flex',
            'Items only works on the inline axis',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 4 — Positioning and stacking',
      description: 'Containing blocks, sticky, and why z-index fails.',
      passingScore: 60,
      questions: [
        {
          prompt: 'An absolutely positioned element is placed against:',
          options: [
            'The viewport, always',
            'Its nearest positioned ancestor',
            'Its direct parent, always',
            'The body',
          ],
          correctIndex: 1,
        },
        {
          prompt: '`position: sticky` silently does nothing when an ancestor has:',
          options: ['`display: flex`', '`overflow: hidden`', 'A border', 'A z-index'],
          correctIndex: 1,
        },
        {
          prompt: 'A dropdown hiding behind a header despite a huge z-index usually means:',
          options: [
            'The z-index is too small',
            'An ancestor created a new stacking context',
            'The dropdown is display:none',
            'The header is sticky',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Which of these creates a new stacking context?',
          options: [
            'A background colour',
            'A transform, filter, or opacity below 1',
            'A margin',
            'A flex container',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Final — Sizing and debugging',
      description: 'Intrinsic sizing, responsive strategy and a method for bugs.',
      passingScore: 70,
      questions: [
        {
          prompt: '`min-content` means:',
          options: [
            'Zero width',
            'The narrowest width the content allows',
            'The widest the content wants',
            'The parent width',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'A component that must respond to its own width rather than the viewport wants:',
          options: ['A media query', 'A container query', 'A percentage width', 'A viewport unit'],
          correctIndex: 1,
        },
        {
          prompt: '`clamp()` is used for fluid type because it:',
          options: [
            'Rounds to whole pixels',
            'Sets a minimum, a preferred value and a maximum in one declaration',
            'Only works with rem',
            'Replaces line-height',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'The first question to ask when a layout is wrong is:',
          options: [
            'What colour is the element',
            'What is the display type of the parent',
            'What is the z-index',
            'What font is applied',
          ],
          correctIndex: 1,
        },
      ],
    },
  ],
};
