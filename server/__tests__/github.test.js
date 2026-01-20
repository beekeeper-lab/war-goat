/**
 * GitHub Service Unit Tests
 *
 * Tests for URL utilities and helper functions.
 */

import { describe, test, expect } from 'vitest';
import {
  extractRepoInfo,
  isGitHubUrl,
  formatStarCount,
  mapTopicsToCategories,
} from '../services/github.js';

describe('extractRepoInfo', () => {
  test('extracts owner and repo from standard URL', () => {
    expect(extractRepoInfo('https://github.com/anthropics/claude-code'))
      .toEqual({ owner: 'anthropics', repo: 'claude-code' });
  });

  test('extracts owner and repo from URL with trailing slash', () => {
    expect(extractRepoInfo('https://github.com/facebook/react/'))
      .toEqual({ owner: 'facebook', repo: 'react' });
  });

  test('extracts owner and repo from URL with query params', () => {
    expect(extractRepoInfo('https://github.com/owner/repo?tab=readme'))
      .toEqual({ owner: 'owner', repo: 'repo' });
  });

  test('extracts owner and repo from URL with hash', () => {
    expect(extractRepoInfo('https://github.com/owner/repo#installation'))
      .toEqual({ owner: 'owner', repo: 'repo' });
  });

  test('handles repo names with hyphens', () => {
    expect(extractRepoInfo('https://github.com/my-org/my-cool-repo'))
      .toEqual({ owner: 'my-org', repo: 'my-cool-repo' });
  });

  test('handles repo names with underscores', () => {
    expect(extractRepoInfo('https://github.com/owner/my_repo'))
      .toEqual({ owner: 'owner', repo: 'my_repo' });
  });

  test('returns null for non-GitHub URL', () => {
    expect(extractRepoInfo('https://gitlab.com/owner/repo')).toBeNull();
  });

  test('returns null for GitHub URL without repo', () => {
    expect(extractRepoInfo('https://github.com/owner')).toBeNull();
  });

  test('returns null for GitHub homepage', () => {
    expect(extractRepoInfo('https://github.com')).toBeNull();
  });
});

describe('isGitHubUrl', () => {
  test('returns true for valid GitHub repo URL', () => {
    expect(isGitHubUrl('https://github.com/owner/repo')).toBe(true);
  });

  test('returns true for GitHub URL with trailing slash', () => {
    expect(isGitHubUrl('https://github.com/owner/repo/')).toBe(true);
  });

  test('returns true for GitHub URL with query params', () => {
    expect(isGitHubUrl('https://github.com/owner/repo?tab=issues')).toBe(true);
  });

  test('returns false for non-GitHub URL', () => {
    expect(isGitHubUrl('https://gitlab.com/owner/repo')).toBe(false);
  });

  test('returns false for YouTube URL', () => {
    expect(isGitHubUrl('https://youtube.com/watch?v=123')).toBe(false);
  });

  test('returns false for GitHub URL without repo', () => {
    expect(isGitHubUrl('https://github.com/owner')).toBe(false);
  });

  test('returns false for empty string', () => {
    expect(isGitHubUrl('')).toBe(false);
  });
});

describe('formatStarCount', () => {
  test('formats thousands as k', () => {
    expect(formatStarCount(1234)).toBe('1.2k');
  });

  test('formats exact thousand', () => {
    expect(formatStarCount(1000)).toBe('1k');
  });

  test('formats large thousands', () => {
    expect(formatStarCount(15600)).toBe('15.6k');
  });

  test('keeps small numbers as-is', () => {
    expect(formatStarCount(500)).toBe('500');
  });

  test('keeps 999 as-is', () => {
    expect(formatStarCount(999)).toBe('999');
  });

  test('handles zero', () => {
    expect(formatStarCount(0)).toBe('0');
  });

  test('formats millions as M', () => {
    expect(formatStarCount(1500000)).toBe('1.5M');
  });

  test('formats exact million', () => {
    expect(formatStarCount(1000000)).toBe('1M');
  });
});

describe('mapTopicsToCategories', () => {
  test('capitalizes single-word topics', () => {
    expect(mapTopicsToCategories(['react', 'javascript']))
      .toEqual(['React', 'Javascript']);
  });

  test('capitalizes hyphenated topics', () => {
    expect(mapTopicsToCategories(['machine-learning']))
      .toEqual(['Machine-learning']);
  });

  test('handles empty array', () => {
    expect(mapTopicsToCategories([])).toEqual([]);
  });

  test('handles already capitalized topics', () => {
    expect(mapTopicsToCategories(['TypeScript']))
      .toEqual(['TypeScript']);
  });

  test('preserves order', () => {
    expect(mapTopicsToCategories(['c', 'b', 'a']))
      .toEqual(['C', 'B', 'A']);
  });
});
