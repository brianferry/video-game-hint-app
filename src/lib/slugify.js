/**
 * @param {string} str
 * @returns {string}
 */
function titleDisambiguator(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h, 33) ^ str.charCodeAt(i);
  }
  return (h >>> 0).toString(36).padStart(7, '0').slice(0, 8);
}

/**
 * @param {string} title
 * @returns {string}
 */
export function slugifyTitle(title) {
  const trimmed = title.trim();
  const s = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!trimmed) {
    return s || 'my-game';
  }
  if (s) {
    return s;
  }
  return `game-${titleDisambiguator(trimmed)}`;
}
