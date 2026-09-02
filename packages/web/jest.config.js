// Jest for UNIT tests (src/**/*.test.ts).
//
// Boundary with Playwright: Playwright owns `tests/*.spec.ts` (browser e2e),
// Jest owns `src/**/*.test.ts(x)` (logic and components). `roots` is what keeps
// Jest from trying to execute the Playwright specs and failing on them.
//
// Built on next/jest so TS, JSX, path aliases and 'use client' directives are
// transformed exactly the way the app itself is built — no parallel Babel
// config to drift out of sync.
const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

module.exports = createJestConfig({
  // Pure-logic tests run in node (faster, no DOM). A component test can opt
  // into the DOM per file with a `@jest-environment jsdom` docblock.
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
});
