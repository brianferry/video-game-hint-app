import { describe, test, expect } from 'vitest';
import { processSpoilers, renderHint } from '../../src/lib/markdown.js';

describe('processSpoilers', () => {
  test('converts [SPOILER: text] to details element', () => {
    const input = 'The key is [SPOILER: under the mat] nearby.';
    const result = processSpoilers(input);
    expect(result).toContain('<details class="spoiler">');
    expect(result).toContain('<summary>Show spoiler</summary>');
    expect(result).toContain('under the mat');
    expect(result).toContain('</details>');
    expect(result).toContain('nearby.');
  });

  test('handles multiple spoiler tags', () => {
    const input = '[SPOILER: first] and [SPOILER: second]';
    const result = processSpoilers(input);
    expect(result.match(/<details/g)).toHaveLength(2);
  });

  test('leaves text without spoiler tags unchanged', () => {
    const input = 'No spoilers here.';
    expect(processSpoilers(input)).toBe(input);
  });
});

describe('renderHint', () => {
  test('renders markdown bold', () => {
    const result = renderHint('Use the **Hookshot** to reach it.');
    expect(result).toContain('<strong>Hookshot</strong>');
  });

  test('renders markdown lists', () => {
    const result = renderHint('Try these:\n- Option A\n- Option B');
    expect(result).toContain('<li>Option A</li>');
    expect(result).toContain('<li>Option B</li>');
  });

  test('renders spoilers within markdown', () => {
    const result = renderHint('The answer is [SPOILER: 42] obviously.');
    expect(result).toContain('<details class="spoiler">');
    expect(result).toContain('42');
  });

  test('returns HTML string', () => {
    const result = renderHint('Hello world');
    expect(typeof result).toBe('string');
    expect(result).toContain('Hello world');
  });
});

describe('XSS sanitization', () => {
  test('strips script tags from hint text', () => {
    const result = renderHint('Try this: <script>alert("xss")</script> and continue.');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert');
    expect(result).toContain('Try this:');
  });

  test('strips onerror handler from img tags', () => {
    const result = renderHint('Look at <img onerror=alert(1) src=x> this.');
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('alert');
  });

  test('strips XSS payload inside SPOILER tags', () => {
    const result = renderHint('[SPOILER: <img onerror=alert(1) src=x>]');
    expect(result).toContain('<details');
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('alert');
  });

  test('strips javascript: protocol from links', () => {
    const result = renderHint('[click me](javascript:alert(1))');
    expect(result).not.toContain('javascript:');
  });

  test('preserves safe HTML within spoilers', () => {
    const result = renderHint('[SPOILER: Use the Hookshot here]');
    expect(result).toContain('<details');
    expect(result).toContain('Use the Hookshot here');
    expect(result).toContain('</details>');
  });
});
