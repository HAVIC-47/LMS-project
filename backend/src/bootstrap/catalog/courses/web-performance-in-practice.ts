import type { CourseSeed } from '../types';

export const webPerformanceInPractice: CourseSeed = {
  title: 'Web Performance in Practice',
  slug: 'web-performance-in-practice',
  level: 'advanced',
  description:
    'Measure first, then fix. Core Web Vitals, the critical path, images, JavaScript cost and caching — with the trade-offs each one actually carries.',
  isPublished: true,
  ownerEmail: 'instructor@lms.test',
  lessons: [
    {
      title: 'Measure before you change anything',
      contentType: 'text',
      body: 'Optimising without a profile is guessing with extra steps. Establish the number you are moving and the conditions you measured it under, or you will not be able to tell an improvement from noise.',
    },
    {
      title: 'Lab data and field data',
      contentType: 'text',
      body: 'Lab tools run on one machine on one connection and are reproducible. Field data comes from real users on real devices and is what actually matters. Lab data finds causes; field data decides priorities — using either alone is how teams optimise something nobody experienced.',
    },
    {
      title: 'Core Web Vitals, and what each one blames',
      contentType: 'text',
      body: 'LCP measures when the main content appeared and usually blames the network or the server. CLS measures unexpected movement and usually blames missing dimensions. INP measures responsiveness and almost always blames long JavaScript tasks.',
    },
    {
      title: 'The critical rendering path',
      contentType: 'text',
      body: 'HTML is parsed into the DOM, CSS into the CSSOM, and nothing paints until both exist. That is why stylesheets are render-blocking by design and why a synchronous script in the head stops the parser dead.',
    },
    {
      title: 'Loading JavaScript without blocking',
      contentType: 'text',
      body: '`defer` keeps document order and runs after parsing; `async` runs at an unpredictable point as soon as it arrives. Use `defer` for anything that touches the DOM or depends on another script, and `async` only for genuinely independent tags.',
    },
    {
      title: 'The real cost of a JavaScript bundle',
      contentType: 'text',
      body: 'Bytes are the cheap part. Parse, compile and execute all happen on the main thread and scale with the device, which is why a bundle that feels instant on a laptop can cost seconds on a mid-range phone.',
    },
    {
      title: 'Code splitting that helps',
      contentType: 'text',
      body: 'Split at routes first, then at genuinely heavy interactive components. Splitting into dozens of tiny chunks trades one large request for a waterfall of small ones, which is usually worse.',
    },
    {
      title: 'Images: format, size, and the two attributes',
      contentType: 'text',
      body: 'Serve modern formats, serve the size actually displayed via `srcset`, and always set width and height so the browser can reserve the space. Those two attributes are the single most effective fix for layout shift.',
    },
    {
      title: 'Lazy loading, and when not to',
      contentType: 'text',
      body: 'Lazy load what is below the fold. Lazy loading the hero image delays the very thing LCP measures, which is the most common way a performance change makes the score worse.',
    },
    {
      title: 'Fonts without invisible text',
      contentType: 'text',
      body: 'A web font that blocks rendering leaves a blank page. `font-display: swap` shows fallback text immediately, preloading the file cuts the swap, and matching the fallback\'s metrics reduces the reflow when the real font lands.',
    },
    {
      title: 'Caching: the browser and the CDN',
      contentType: 'text',
      body: 'Hash the filename and cache immutably forever; the deploy changes the name, so invalidation is never needed. HTML is the exception — it must revalidate, because it is what points at everything else.',
    },
    {
      title: 'Where rendering happens',
      contentType: 'text',
      body: 'Static generation is fastest and staleness is the cost. Server rendering is fresh and costs server time. Client rendering pushes work to the slowest device in the chain. Most pages want a mix, chosen per route rather than per project.',
    },
    {
      title: 'Long tasks and INP',
      contentType: 'text',
      body: 'A task over 50ms blocks input handling, so a single long loop can make a whole page feel broken. Break work into chunks, yield to the main thread, and move genuinely heavy computation into a worker.',
    },
    {
      title: 'Reflow, repaint and compositing',
      contentType: 'text',
      body: 'Changing geometry forces layout; changing colour forces paint; `transform` and `opacity` can often be handled by the compositor alone. Reading a layout property immediately after writing one forces a synchronous reflow — batch reads, then writes.',
    },
    {
      title: 'Performance budgets',
      contentType: 'text',
      body: 'A budget turns performance from an occasional cleanup into a constraint the team designs against. Enforce it in CI, because a number nobody is accountable for goes back up within two sprints.',
    },
  ],
  quizzes: [
    {
      title: 'Checkpoint 1 — Measurement',
      description: 'Lab versus field, and what each vital indicates.',
      passingScore: 60,
      questions: [
        {
          prompt: 'Field data is preferable for deciding priorities because it:',
          options: [
            'Is more reproducible',
            'Comes from real users on real devices',
            'Runs faster',
            'Requires no tooling',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Unexpected movement of content is measured by:',
          options: ['LCP', 'CLS', 'INP', 'TTFB'],
          correctIndex: 1,
        },
        {
          prompt: 'A poor INP most often points to:',
          options: [
            'Large images',
            'Long JavaScript tasks on the main thread',
            'Slow DNS',
            'Missing width attributes',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Optimising without a profile is:',
          options: [
            'Standard practice',
            'Guessing, with no way to distinguish an improvement from noise',
            'Fine for small sites',
            'Recommended for CLS',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 2 — The critical path',
      description: 'Render blocking and script loading.',
      passingScore: 60,
      questions: [
        {
          prompt: 'Nothing paints until the browser has built:',
          options: [
            'The DOM only',
            'Both the DOM and the CSSOM',
            'The bundle',
            'The font file',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'A synchronous script in the head:',
          options: [
            'Runs after parsing',
            'Stops the parser until it is fetched and executed',
            'Is deferred automatically',
            'Only affects CLS',
          ],
          correctIndex: 1,
        },
        {
          prompt: '`defer` differs from `async` because it:',
          options: [
            'Downloads sooner',
            'Preserves document order and runs after parsing',
            'Blocks rendering',
            'Skips execution',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'For a script that touches the DOM you should use:',
          options: ['async', 'defer', 'No attribute', 'type="module" only'],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 3 — JavaScript cost',
      description: 'Bundles, splitting and long tasks.',
      passingScore: 60,
      questions: [
        {
          prompt: 'The expensive part of a large bundle on a mid-range phone is usually:',
          options: [
            'Transfer size',
            'Parse, compile and execute on the main thread',
            'DNS lookup',
            'Compression',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Splitting into dozens of tiny chunks risks:',
          options: [
            'Larger total bytes only',
            'Trading one request for a waterfall of small ones',
            'Breaking caching entirely',
            'Blocking the parser',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'A task blocks input handling once it exceeds roughly:',
          options: ['5ms', '50ms', '500ms', '2s'],
          correctIndex: 1,
        },
        {
          prompt: 'The first place to split a bundle is:',
          options: ['Per component', 'At routes', 'Per npm package', 'Per CSS file'],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Checkpoint 4 — Media and fonts',
      description: 'Images, lazy loading and font strategy.',
      passingScore: 60,
      questions: [
        {
          prompt: 'The most effective fix for layout shift from images is:',
          options: [
            'Lazy loading',
            'Setting width and height so space is reserved',
            'Using WebP',
            'A CDN',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Lazy loading the hero image typically:',
          options: [
            'Improves LCP',
            'Delays the very element LCP measures',
            'Has no effect',
            'Fixes CLS',
          ],
          correctIndex: 1,
        },
        {
          prompt: '`font-display: swap` prevents:',
          options: [
            'Layout shift entirely',
            'Invisible text while the font loads',
            'Font downloading',
            'Reflow',
          ],
          correctIndex: 1,
        },
        {
          prompt: '`srcset` exists so the browser can:',
          options: [
            'Choose a format',
            'Download the size actually displayed',
            'Lazy load',
            'Preload fonts',
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: 'Final — Caching, rendering and budgets',
      description: 'Immutable assets, where to render, and holding the line.',
      passingScore: 70,
      questions: [
        {
          prompt: 'Hashed asset filenames can be cached immutably because:',
          options: [
            'They are compressed',
            'A deploy changes the name, so invalidation is never needed',
            'CDNs ignore them',
            'They are small',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'HTML is the exception to long caching because it:',
          options: [
            'Is large',
            'Points at everything else',
            'Cannot be gzipped',
            'Is rendered client-side',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'Reading a layout property immediately after writing one causes:',
          options: [
            'A compositor pass',
            'A synchronous reflow',
            'A repaint only',
            'A cache miss',
          ],
          correctIndex: 1,
        },
        {
          prompt: 'A performance budget must be enforced in CI because otherwise:',
          options: [
            'It cannot be measured',
            'The number goes back up within a couple of sprints',
            'Browsers ignore it',
            'It only applies to images',
          ],
          correctIndex: 1,
        },
      ],
    },
  ],
};
