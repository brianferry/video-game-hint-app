import { marked } from 'marked';
import DOMPurify from 'dompurify';

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
 * Output is sanitized to prevent XSS from user-imported game JSON.
 */
export function renderHint(text) {
  const withSpoilers = processSpoilers(text);
  const html = marked.parse(withSpoilers, { breaks: true, gfm: true });
  return DOMPurify.sanitize(html);
}
