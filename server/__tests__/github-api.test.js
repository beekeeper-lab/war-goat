/**
 * GitHub Service API Integration Tests
 *
 * Tests for API functions with mocked fetch responses.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getMetadata,
  getReadme,
  enrichGitHubUrl,
} from '../services/github.js';

// Mock fetch globally
const originalFetch = global.fetch;

describe('getMetadata', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('returns repo data for valid repository', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (name) => {
          if (name === 'X-RateLimit-Remaining') return '59';
          if (name === 'X-RateLimit-Reset') return '1609459200';
          return null;
        },
      },
      json: () => Promise.resolve({
        name: 'react',
        full_name: 'facebook/react',
        description: 'A declarative, efficient UI library',
        owner: {
          login: 'facebook',
          avatar_url: 'https://avatars.githubusercontent.com/u/69631?v=4',
        },
        stargazers_count: 225000,
        forks_count: 45000,
        language: 'JavaScript',
        topics: ['react', 'javascript', 'ui'],
        license: { name: 'MIT License' },
        open_issues_count: 1500,
        pushed_at: '2024-01-15T10:30:00Z',
        default_branch: 'main',
        html_url: 'https://github.com/facebook/react',
      }),
    });

    const result = await getMetadata('facebook', 'react');

    expect(result.success).toBe(true);
    expect(result.data.name).toBe('react');
    expect(result.data.stars).toBe(225000);
    expect(result.data.language).toBe('JavaScript');
    expect(result.data.topics).toEqual(['react', 'javascript', 'ui']);
  });

  test('returns error for non-existent repository', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: {
        get: () => null,
      },
    });

    const result = await getMetadata('nonexistent', 'repo123');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Repository not found');
  });

  test('returns error for rate limiting', async () => {
    const resetTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: {
        get: (name) => {
          if (name === 'X-RateLimit-Remaining') return '0';
          if (name === 'X-RateLimit-Reset') return String(resetTime);
          return null;
        },
      },
    });

    const result = await getMetadata('owner', 'repo');

    expect(result.success).toBe(false);
    expect(result.error).toContain('rate limit exceeded');
    expect(result.rateLimitReset).toBe(resetTime);
  });

  test('returns error for private repository (403 without rate limit)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: {
        get: (name) => {
          if (name === 'X-RateLimit-Remaining') return '50';
          return null;
        },
      },
    });

    const result = await getMetadata('owner', 'private-repo');

    expect(result.success).toBe(false);
    expect(result.error).toContain('private repository');
  });
});

describe('getReadme', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('returns README content for valid repository', async () => {
    const readmeContent = '# My Repo\n\nThis is a test README.';
    const base64Content = Buffer.from(readmeContent).toString('base64');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        content: base64Content,
        encoding: 'base64',
      }),
    });

    const result = await getReadme('owner', 'repo');

    expect(result.success).toBe(true);
    expect(result.content).toBe(readmeContent);
  });

  test('returns error for repository without README', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const result = await getReadme('owner', 'no-readme-repo');

    expect(result.success).toBe(false);
    expect(result.error).toContain('README not found');
  });
});

describe('enrichGitHubUrl', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('returns enriched data for valid repository', async () => {
    const readmeContent = '# Test Repo';
    const base64Content = Buffer.from(readmeContent).toString('base64');

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: () => Promise.resolve({
          name: 'test-repo',
          full_name: 'owner/test-repo',
          description: 'A test repository',
          owner: {
            login: 'owner',
            avatar_url: 'https://avatar.url',
          },
          stargazers_count: 100,
          forks_count: 20,
          language: 'TypeScript',
          topics: ['typescript', 'testing'],
          license: { name: 'MIT' },
          open_issues_count: 5,
          pushed_at: '2024-01-15T10:00:00Z',
          default_branch: 'main',
          html_url: 'https://github.com/owner/test-repo',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          content: base64Content,
          encoding: 'base64',
        }),
      });

    const result = await enrichGitHubUrl('https://github.com/owner/test-repo');

    expect(result.success).toBe(true);
    expect(result.type).toBe('github');
    expect(result.data.title).toBe('test-repo');
    expect(result.data.stars).toBe(100);
    expect(result.data.language).toBe('TypeScript');
    expect(result.data.hasReadme).toBe(true);
    expect(result.data.readme).toBe(readmeContent);
    expect(result.data.categories).toEqual(['Typescript', 'Testing']);
  });

  test('returns partial success when README fails', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: () => Promise.resolve({
          name: 'test-repo',
          full_name: 'owner/test-repo',
          description: 'A test repository',
          owner: {
            login: 'owner',
            avatar_url: 'https://avatar.url',
          },
          stargazers_count: 100,
          forks_count: 20,
          language: 'JavaScript',
          topics: [],
          license: null,
          open_issues_count: 0,
          pushed_at: '2024-01-15T10:00:00Z',
          default_branch: 'main',
          html_url: 'https://github.com/owner/test-repo',
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

    const result = await enrichGitHubUrl('https://github.com/owner/test-repo');

    expect(result.success).toBe(true);
    expect(result.data.hasReadme).toBe(false);
    expect(result.data.readme).toBeNull();
    expect(result.data.readmeError).toContain('README not found');
  });

  test('returns error for invalid URL', async () => {
    const result = await enrichGitHubUrl('https://gitlab.com/owner/repo');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid GitHub URL');
  });

  test('returns error when repository not found', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: { get: () => null },
    });

    const result = await enrichGitHubUrl('https://github.com/nonexistent/repo');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Repository not found');
  });
});
