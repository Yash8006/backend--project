/**
 * searchHistory.js
 * Persists user search queries in localStorage so the home page
 * can personalise genre rows based on what the user searches for.
 */

const STORAGE_KEY = 'videotube_search_history';
const MAX_ENTRIES = 100; // keep the last 100 searches

/**
 * Save a search query.
 * Deduplicates: if the same query exists it is moved to the top (most-recent).
 */
export function saveSearch(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q || q.length < 2) return;
  try {
    const raw  = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    // Remove any existing entry for this query
    const filtered = list.filter(e => e.q !== q);
    filtered.unshift({ q, at: Date.now() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_ENTRIES)));
  } catch (_) {}
}

/**
 * Return the full search history array, most-recent first.
 * Each entry: { q: string, at: number (epoch ms) }
 */
export function getSearchHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

/** Clear all saved searches (e.g. on logout). */
export function clearSearchHistory() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
}
