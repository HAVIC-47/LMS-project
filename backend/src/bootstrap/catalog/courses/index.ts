import type { CourseSeed } from '../types';
import { cssLayoutFromFirstPrinciples } from './css-layout-from-first-principles';
import { designingHttpApis } from './designing-http-apis';
import { gitForTeams } from './git-for-teams';
import { javascriptUnderTheHood } from './javascript-under-the-hood';
import { reactRenderingAndState } from './react-rendering-and-state';
import { sqlAndRelationalThinking } from './sql-and-relational-thinking';
import { testingThatEarnsItsKeep } from './testing-that-earns-its-keep';
import { typescriptForWorkingDevelopers } from './typescript-for-working-developers';
import { webPerformanceInPractice } from './web-performance-in-practice';
import { webSecurityEssentials } from './web-security-essentials';

/**
 * The catalog, in the order it reads best rather than alphabetically: foundations first,
 * then the things built on them, then the two advanced courses.
 *
 * Ownership is split between the instructor and the content manager on purpose. A catalog
 * owned entirely by one account cannot demonstrate the difference between "edit any
 * course" and "edit own courses only", which is the part of the permission matrix most
 * worth being able to show.
 */
export const COURSES: CourseSeed[] = [
  cssLayoutFromFirstPrinciples,
  javascriptUnderTheHood,
  gitForTeams,
  sqlAndRelationalThinking,
  typescriptForWorkingDevelopers,
  reactRenderingAndState,
  designingHttpApis,
  testingThatEarnsItsKeep,
  webSecurityEssentials,
  webPerformanceInPractice,
];
