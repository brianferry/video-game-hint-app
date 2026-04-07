import { marked } from 'marked';

/**
 * Convert [SPOILER: text] tags to native <details> elements.
 * Must run BEFORE markdown rendering so marked doesn't escape the brackets.
 */
export function processSpoilers(text) {
  return text.replace(
    /\[SPOILER:\s*(.+?)\]/g,
    '<details class="spoiler"><summary>Show spoiler</summary>$1</details>'
  );
}

/**
 * Render a hint string as HTML: spoiler tags first, then markdown.
 */
export function renderHint(text) {
  const withSpoilers = processSpoilers(text);
  return marked.parse(withSpoilers, { breaks: true, gfm: true });
}
