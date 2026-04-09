import { describe, test, expect } from 'vitest';
import {
  parseGameJson,
  validateGameObject,
  validateGameJsonText,
} from '../../src/lib/validate-game-json.js';

function minimalValidGame(overrides = {}) {
  return {
    slug: 'test-import-game-xyz',
    title: 'Test Import Game',
    year: 1999,
    era: '1990s',
    totalEstimatedSituations: 1,
    areas: [
      {
        id: 'area-one',
        name: 'Area One',
        order: 1,
        situations: [
          {
            id: 'sit-one',
            title: 'First situation',
            order: 1,
            context: 'Hero, Area One, stuck on first puzzle',
            tags: ['early-game', 'area-one', 'puzzle', 'navigation', 'test'],
            hints: ['Look around carefully.'],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('parseGameJson', () => {
  test('rejects empty string', () => {
    const r = parseGameJson('   ');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeGreaterThan(0);
  });

  test('parses valid object', () => {
    const r = parseGameJson('{"a":1}');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.a).toBe(1);
  });
});

describe('validateGameObject', () => {
  test('accepts minimal valid game', () => {
    const r = validateGameObject(minimalValidGame());
    expect(r.ok).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  test('rejects bundled slug super-metroid', () => {
    const r = validateGameObject(minimalValidGame({ slug: 'super-metroid' }));
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('built-in'))).toBe(true);
  });

  test('warns when fewer than 5 tags', () => {
    const g = minimalValidGame();
    g.areas[0].situations[0].tags = ['a', 'b', 'c'];
    const r = validateGameObject(g);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  test('rejects missing areas', () => {
    const g = minimalValidGame();
    delete g.areas;
    const r = validateGameObject(g);
    expect(r.ok).toBe(false);
  });

  test('rejects sourceRef without sources', () => {
    const g = minimalValidGame();
    g.areas[0].situations[0].sourceRefs = [{ sourceId: 'src-1', section: 'x' }];
    const r = validateGameObject(g);
    expect(r.ok).toBe(false);
  });

  test('accepts sourceRef when sources present', () => {
    const g = minimalValidGame({
      sources: [
        {
          id: 'src-1',
          name: 'Test',
          url: 'https://example.com',
          author: 'A',
          platform: 'Test',
        },
      ],
    });
    g.areas[0].situations[0].sourceRefs = [{ sourceId: 'src-1', section: 'Intro' }];
    const r = validateGameObject(g);
    expect(r.ok).toBe(true);
  });
});

describe('validateGameJsonText', () => {
  test('full pipeline on stringified valid game', () => {
    const text = JSON.stringify(minimalValidGame());
    const r = validateGameJsonText(text);
    expect(r.ok).toBe(true);
    expect(r.data?.slug).toBe('test-import-game-xyz');
  });

  test('returns a structuredClone-safe plain object when valid', () => {
    const text = JSON.stringify(minimalValidGame());
    const r = validateGameJsonText(text);
    expect(r.ok).toBe(true);
    if (r.ok && r.data) {
      expect(() => structuredClone(r.data)).not.toThrow();
    }
  });
});
