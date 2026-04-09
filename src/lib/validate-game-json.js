import { isBundledSlug } from './bundled-registry.js';

/**
 * @param {string} text
 * @returns {{ ok: true, data: object } | { ok: false, errors: string[] }}
 */
export function parseGameJson(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, errors: ['Paste is empty.'] };
  }
  try {
    const data = JSON.parse(trimmed);
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      return { ok: false, errors: ['Root JSON must be an object.'] };
    }
    return { ok: true, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, errors: [`Invalid JSON: ${msg}`] };
  }
}

/**
 * @param {unknown} v
 * @returns {v is string}
 */
function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * @param {object} obj
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function validateGameObject(obj) {
  const errors = [];
  const warnings = [];

  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, errors: ['Root must be a JSON object.'], warnings };
  }

  if (!isNonEmptyString(obj.slug)) {
    errors.push('Missing or invalid "slug" (non-empty string).');
  } else if (isBundledSlug(obj.slug)) {
    errors.push(
      `Slug "${obj.slug}" conflicts with a built-in game. Use a different slug (e.g. add "-guide" or your name).`
    );
  }

  if (!isNonEmptyString(obj.title)) {
    errors.push('Missing or invalid "title".');
  }

  if (typeof obj.year !== 'number' || !Number.isFinite(obj.year)) {
    errors.push('Missing or invalid "year" (number).');
  }

  if (!isNonEmptyString(obj.era)) {
    errors.push('Missing or invalid "era" (e.g. "1990s").');
  }

  if (
    typeof obj.totalEstimatedSituations !== 'number' ||
    !Number.isFinite(obj.totalEstimatedSituations) ||
    obj.totalEstimatedSituations < 0
  ) {
    errors.push('Missing or invalid "totalEstimatedSituations" (non-negative number).');
  }

  if (!Array.isArray(obj.areas) || obj.areas.length === 0) {
    errors.push('"areas" must be a non-empty array.');
  } else {
    const areaIds = new Set();
    for (let ai = 0; ai < obj.areas.length; ai++) {
      const area = obj.areas[ai];
      const prefix = `areas[${ai}]`;
      if (!area || typeof area !== 'object') {
        errors.push(`${prefix} must be an object.`);
        continue;
      }
      if (!isNonEmptyString(area.id)) {
        errors.push(`${prefix}: missing "id".`);
      } else if (areaIds.has(area.id)) {
        errors.push(`${prefix}: duplicate area id "${area.id}".`);
      } else {
        areaIds.add(area.id);
      }
      if (!isNonEmptyString(area.name)) {
        errors.push(`${prefix}: missing "name".`);
      }
      if (typeof area.order !== 'number' || !Number.isFinite(area.order)) {
        errors.push(`${prefix}: missing or invalid "order" (number).`);
      }
      if (!Array.isArray(area.situations)) {
        errors.push(`${prefix}: "situations" must be an array.`);
        continue;
      }
      const situationIds = new Set();
      for (let si = 0; si < area.situations.length; si++) {
        const sit = area.situations[si];
        const sp = `${prefix}.situations[${si}]`;
        if (!sit || typeof sit !== 'object') {
          errors.push(`${sp} must be an object.`);
          continue;
        }
        if (!isNonEmptyString(sit.id)) {
          errors.push(`${sp}: missing "id".`);
        } else if (situationIds.has(sit.id)) {
          errors.push(`${sp}: duplicate situation id "${sit.id}" in this area.`);
        } else {
          situationIds.add(sit.id);
        }
        if (!isNonEmptyString(sit.title)) {
          errors.push(`${sp}: missing "title".`);
        }
        if (typeof sit.order !== 'number' || !Number.isFinite(sit.order)) {
          errors.push(`${sp}: missing or invalid "order" (number).`);
        }
        if (!isNonEmptyString(sit.context)) {
          errors.push(`${sp}: missing "context".`);
        }
        if (!Array.isArray(sit.tags)) {
          errors.push(`${sp}: "tags" must be an array of strings.`);
        } else {
          if (sit.tags.length < 5) {
            warnings.push(`${sp}: fewer than 5 tags (HINT_RULES recommends 5–8).`);
          }
          for (let ti = 0; ti < sit.tags.length; ti++) {
            if (typeof sit.tags[ti] !== 'string') {
              errors.push(`${sp}: tags[${ti}] must be a string.`);
            }
          }
        }
        if (!Array.isArray(sit.hints)) {
          errors.push(`${sp}: "hints" must be an array.`);
        } else if (sit.hints.length < 1 || sit.hints.length > 3) {
          errors.push(`${sp}: "hints" must have 1–3 entries.`);
        } else {
          for (let hi = 0; hi < sit.hints.length; hi++) {
            if (typeof sit.hints[hi] !== 'string' || !sit.hints[hi].trim()) {
              errors.push(`${sp}: hints[${hi}] must be a non-empty string.`);
            }
          }
        }
        if (sit.sourceRefs !== undefined) {
          if (!Array.isArray(sit.sourceRefs)) {
            errors.push(`${sp}: "sourceRefs" must be an array if present.`);
          } else {
            for (let ri = 0; ri < sit.sourceRefs.length; ri++) {
              const ref = sit.sourceRefs[ri];
              if (!ref || typeof ref !== 'object') {
                errors.push(`${sp}.sourceRefs[${ri}] must be an object.`);
              } else if (!isNonEmptyString(ref.sourceId)) {
                errors.push(`${sp}.sourceRefs[${ri}]: missing "sourceId".`);
              }
            }
          }
        }
      }
    }
  }

  const sourceIds = new Set();
  if (obj.sources !== undefined) {
    if (!Array.isArray(obj.sources)) {
      errors.push('"sources" must be an array if present.');
    } else {
      for (let i = 0; i < obj.sources.length; i++) {
        const s = obj.sources[i];
        if (!s || typeof s !== 'object') {
          errors.push(`sources[${i}] must be an object.`);
          continue;
        }
        if (!isNonEmptyString(s.id)) {
          errors.push(`sources[${i}]: missing "id".`);
        } else if (sourceIds.has(s.id)) {
          errors.push(`sources[${i}]: duplicate source id "${s.id}".`);
        } else {
          sourceIds.add(s.id);
        }
        if (!isNonEmptyString(s.name)) {
          errors.push(`sources[${i}]: missing "name".`);
        }
      }
    }
  }

  let reportedMissingSources = false;
  if (Array.isArray(obj.areas)) {
    for (const area of obj.areas) {
      if (!area?.situations) continue;
      for (const sit of area.situations) {
        if (!sit?.sourceRefs?.length) continue;
        for (const ref of sit.sourceRefs) {
          if (!ref?.sourceId) continue;
          if (sourceIds.size === 0) {
            if (!reportedMissingSources) {
              errors.push(
                'Situations use sourceRefs but the game has no "sources" array with matching ids.'
              );
              reportedMissingSources = true;
            }
            continue;
          }
          if (!sourceIds.has(ref.sourceId)) {
            errors.push(
              `sourceRefs reference unknown sourceId "${ref.sourceId}" (not in game "sources").`
            );
          }
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Full pipeline: parse JSON text then validate structure.
 * @param {string} text
 * @returns {{ ok: boolean, data?: object, errors: string[], warnings: string[] }}
 */
export function validateGameJsonText(text) {
  const parsed = parseGameJson(text);
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors, warnings: [] };
  }
  const { ok, errors, warnings } = validateGameObject(parsed.data);
  /** Plain object tree — safe for Svelte state / IndexedDB (no Proxy wrappers). */
  let data;
  if (ok) {
    try {
      data = JSON.parse(JSON.stringify(parsed.data));
    } catch {
      data = parsed.data;
    }
  }
  return {
    ok,
    data,
    errors,
    warnings,
  };
}
