function storageGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage full or unavailable */ }
}

// --- Hint progress ---

export function getProgress(gameSlug, areaId, situationId) {
  const key = `hint-progress/${gameSlug}/${areaId}/${situationId}`;
  return storageGet(key) || { revealedCount: 0 };
}

export function saveProgress(gameSlug, areaId, situationId, revealedCount) {
  const key = `hint-progress/${gameSlug}/${areaId}/${situationId}`;
  storageSet(key, { revealedCount, viewedAt: new Date().toISOString() });
}

// --- Analytics ---

export function trackView(gameSlug, areaId, situationId) {
  const analytics = storageGet('analytics') || { situations: {} };
  const path = `${gameSlug}/${areaId}/${situationId}`;
  const current = analytics.situations[path] || { viewCount: 0 };
  analytics.situations[path] = {
    viewCount: current.viewCount + 1,
    lastViewed: new Date().toISOString(),
  };
  storageSet('analytics', analytics);
}

// --- Theme ---

export function getTheme() {
  try {
    return localStorage.getItem('theme');
  } catch {
    return null;
  }
}

export function saveTheme(theme) {
  try {
    localStorage.setItem('theme', theme);
  } catch { /* unavailable */ }
}
