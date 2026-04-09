/**
 * Build a GitHub "new issue" URL with a prefilled title and instructions.
 * Default base URL is derived from `repository` in package.json.
 * Override at build time with `VITE_GITHUB_NEW_ISSUE_URL` (full `/issues/new` URL).
 */

import pkg from '../../package.json';

/**
 * @returns {string | null}
 */
function newIssueUrlFromPackageRepository() {
  const repo = pkg.repository;
  if (!repo) return null;
  let url = typeof repo === 'string' ? repo : repo.url;
  if (!url) return null;
  url = url.replace(/^git\+/, '').replace(/\.git$/, '');
  if (url.startsWith('git@github.com:')) {
    url = `https://github.com/${url.slice('git@github.com:'.length)}`;
  }
  const m = url.match(/github\.com[/:]([^/]+)\/([^/]+)/);
  if (!m) return null;
  return `https://github.com/${m[1]}/${m[2]}/issues/new`;
}

/**
 * @returns {string | null} Null if neither `VITE_GITHUB_NEW_ISSUE_URL` nor `package.json` `repository` yields a GitHub issues URL.
 */
export function getNewIssueBaseUrl() {
  const raw = import.meta.env?.VITE_GITHUB_NEW_ISSUE_URL;
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim().replace(/\/$/, '');
  }
  return newIssueUrlFromPackageRepository();
}

/**
 * @param {{ slug: string; title: string }} game
 * @returns {string | null}
 */
export function buildContributeIssueUrl(game) {
  const base = getNewIssueBaseUrl();
  if (!base) return null;
  const issueTitle = `Guide submission: ${game.slug}`;
  const body = buildIssueBody(game);
  const u = new URL(base);
  u.searchParams.set('title', issueTitle);
  u.searchParams.set('body', body);
  return u.toString();
}

/**
 * @param {{ slug: string; title: string }} game
 * @returns {string}
 */
function buildIssueBody(game) {
  return [
    '### Submit a guide for the official Retro Game Hints dataset',
    '',
    'Please **paste your full validated game JSON** in a comment below using a fenced `json` code block.',
    '',
    `**Game title:** ${game.title}`,
    `**Slug:** \`${game.slug}\``,
    '',
    `**Suggested file path:** \`src/data/games/<era>/${game.slug}.json\``,
    '',
    '**Maintainer checklist**',
    '- [ ] JSON follows `HINT_RULES.md`',
    '- [ ] Slug is unique (no collision with bundled games)',
    '- [ ] `totalEstimatedSituations` is reasonable for coverage',
    '',
    '---',
    '',
    '```json',
    '',
    '```',
    '',
    '_Paste your JSON between the fences above. If the body is too large for GitHub, attach a `.json` file or link a gist._',
  ].join('\n');
}
