import { describe, test, expect } from 'vitest';
import { buildContributeIssueUrl, getNewIssueBaseUrl } from '../../src/lib/contribute-issue.js';

describe('contribute-issue', () => {
  test('getNewIssueBaseUrl returns a string ending with issues path', () => {
    const base = getNewIssueBaseUrl();
    expect(base).not.toBeNull();
    expect(base).toMatch(/issues\/new$/);
  });

  test('buildContributeIssueUrl encodes title, slug, and instructions', () => {
    const url = buildContributeIssueUrl({ slug: 'test-game-slug', title: 'Test Game Title' });
    expect(url).not.toBeNull();
    const parsed = new URL(/** @type {string} */ (url));
    expect(parsed.pathname).toContain('/issues/new');
    expect(parsed.searchParams.get('title')).toBe('Guide submission: test-game-slug');
    const body = parsed.searchParams.get('body') ?? '';
    expect(body).toContain('Test Game Title');
    expect(body).toContain('test-game-slug');
    expect(body).toContain('```json');
    expect(body).toContain('HINT_RULES.md');
  });
});
