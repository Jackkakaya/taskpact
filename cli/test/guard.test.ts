import { describe, it, expect } from 'vitest';
import { globToRegExp } from '../dist/commands/guard.js';

describe('globToRegExp', () => {
  const cases: [string, string, boolean][] = [
    ['src/api/**', 'src/api/auth/login.ts', true],
    ['src/api/**', 'src/payment/charge.ts', false],
    ['tests/**', 'tests/a/b.test.ts', true],
    ['src/*.ts', 'src/index.ts', true],
    ['src/*.ts', 'src/core/x.ts', false], // * does not cross /
    ['tests/integration/register.test.ts', 'tests/integration/register.test.ts', true],
    ['tests/integration/register.test.ts', 'tests/integration/other.test.ts', false],
    ['.spec/**', '.spec/contracts/x.md', true],
    ['.spec/**', 'src/spec.ts', false], // leading dot is literal, not wildcard
    ['a/**/b', 'a/x/y/b', true],
    ['a/**/b', 'a/b', true], // ** collapses zero dirs
  ];

  for (const [glob, file, expected] of cases) {
    it(`${glob} ${expected ? 'matches' : 'rejects'} ${file}`, () => {
      expect(globToRegExp(glob).test(file)).toBe(expected);
    });
  }
});
