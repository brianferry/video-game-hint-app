import { isBundledSlug } from './bundled-registry.js';

const DB_NAME = 'retro-hints-db';
const DB_VERSION = 1;
const STORE_NAME = 'user-games';

/** @type {Map<string, object>} */
const cache = new Map();

export const USER_GAMES_CHANGED = 'user-games-changed';

function notifyChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(USER_GAMES_CHANGED));
  }
}

/**
 * @returns {Promise<IDBDatabase>}
 */
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'slug' });
      }
    };
  });
}

let dbPromise = null;

function getDb() {
  if (!dbPromise) dbPromise = openDb();
  return dbPromise;
}

/**
 * Load all user games from IndexedDB into memory. Call once before app mount.
 * @returns {Promise<void>}
 */
export async function initUserGames() {
  if (typeof indexedDB === 'undefined') {
    return;
  }
  try {
    const db = await getDb();
    const games = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    cache.clear();
    for (const game of games) {
      if (game && game.slug) {
        cache.set(game.slug, game);
      }
    }
  } catch {
    /* IDB unavailable */
  }
}

/**
 * @param {string} slug
 * @returns {object | null}
 */
export function getUserGame(slug) {
  return cache.get(slug) || null;
}

/**
 * @returns {object[]}
 */
export function getAllUserGames() {
  return Array.from(cache.values());
}

/**
 * @returns {string[]}
 */
export function getUserSlugs() {
  return Array.from(cache.keys());
}

/**
 * Deep-clone to a plain object tree. Svelte $state (and similar) wrap values in
 * Proxies; IndexedDB structured-clone rejects Proxies — always serialize here.
 * @param {object} data
 * @returns {object}
 */
function toPlainDeep(data) {
  return JSON.parse(JSON.stringify(data));
}

/**
 * @param {object} data Full game JSON
 * @returns {Promise<void>}
 * @throws {Error} If slug conflicts with a bundled game or IndexedDB is unavailable
 */
export async function saveUserGame(data) {
  if (!data || typeof data.slug !== 'string') {
    throw new Error('Invalid game data: missing slug');
  }
  if (isBundledSlug(data.slug)) {
    throw new Error(
      `The slug "${data.slug}" is already used by a built-in game. Change the slug in your JSON and try again.`
    );
  }
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available in this environment.');
  }
  const db = await getDb();
  const plain = toPlainDeep(data);
  const toStore = { ...plain, isLocal: true };
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(toStore);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  cache.set(data.slug, toStore);
  notifyChanged();
}

/**
 * @param {string} slug
 * @returns {Promise<void>}
 */
export async function removeUserGame(slug) {
  if (typeof indexedDB === 'undefined') {
    return;
  }
  const db = await getDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(slug);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  cache.delete(slug);
  notifyChanged();
}
