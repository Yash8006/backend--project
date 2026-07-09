import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const SettingsContext = createContext(null);

const STORAGE_KEY = 'video_tube_settings';

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* quota exceeded — silently fail */ }
}

const DEFAULT_SETTINGS = {
  commentBlockedVideos: {}, // { [videoId]: { title, thumbnail, channelTitle, blockedAt } }
  commentTimeout: 60,       // seconds: 30 | 60 | 120
  hideShorts: false,
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    const saved = loadSettings();
    return { ...DEFAULT_SETTINGS, ...saved };
  });

  // Temp-allowed videos: { [videoId]: expiresAt (timestamp) }
  const [tempAllowed, setTempAllowed] = useState({});
  const timersRef = useRef({});

  // Persist on every change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, []);

  // ── Comment Blocking ──────────────────────────────────────────────

  const blockVideoComments = useCallback((videoId, meta = {}) => {
    setSettings(prev => ({
      ...prev,
      commentBlockedVideos: {
        ...prev.commentBlockedVideos,
        [videoId]: {
          title: meta.title || 'Unknown Video',
          thumbnail: meta.thumbnail || '',
          channelTitle: meta.channelTitle || '',
          blockedAt: Date.now(),
        },
      },
    }));
    // Also remove from temp-allowed if present
    setTempAllowed(prev => {
      const next = { ...prev };
      delete next[videoId];
      return next;
    });
    if (timersRef.current[videoId]) {
      clearTimeout(timersRef.current[videoId]);
      delete timersRef.current[videoId];
    }
  }, []);

  const unblockVideoComments = useCallback((videoId) => {
    setSettings(prev => {
      const next = { ...prev.commentBlockedVideos };
      delete next[videoId];
      return { ...prev, commentBlockedVideos: next };
    });
    // Also remove from temp-allowed
    setTempAllowed(prev => {
      const next = { ...prev };
      delete next[videoId];
      return next;
    });
    if (timersRef.current[videoId]) {
      clearTimeout(timersRef.current[videoId]);
      delete timersRef.current[videoId];
    }
  }, []);

  const isCommentsBlocked = useCallback((videoId) => {
    // Blocked AND not temporarily allowed
    const blocked = !!settings.commentBlockedVideos[videoId];
    if (!blocked) return false;
    const allowed = tempAllowed[videoId];
    if (allowed && Date.now() < allowed) return false;
    return true;
  }, [settings.commentBlockedVideos, tempAllowed]);

  const tempAllowComments = useCallback((videoId) => {
    const durationMs = settings.commentTimeout * 1000;
    const expiresAt = Date.now() + durationMs;

    setTempAllowed(prev => ({ ...prev, [videoId]: expiresAt }));

    // Clear existing timer
    if (timersRef.current[videoId]) {
      clearTimeout(timersRef.current[videoId]);
    }

    // Set auto-revoke timer
    timersRef.current[videoId] = setTimeout(() => {
      setTempAllowed(prev => {
        const next = { ...prev };
        delete next[videoId];
        return next;
      });
      delete timersRef.current[videoId];
    }, durationMs);

    return expiresAt;
  }, [settings.commentTimeout]);

  const getTempAllowExpiry = useCallback((videoId) => {
    return tempAllowed[videoId] || null;
  }, [tempAllowed]);

  // ── Comment Timeout ───────────────────────────────────────────────

  const setCommentTimeout = useCallback((seconds) => {
    setSettings(prev => ({ ...prev, commentTimeout: seconds }));
  }, []);

  // ── Hide Shorts ───────────────────────────────────────────────────

  const toggleHideShorts = useCallback(() => {
    setSettings(prev => ({ ...prev, hideShorts: !prev.hideShorts }));
  }, []);

  const value = {
    // State
    commentBlockedVideos: settings.commentBlockedVideos,
    commentTimeout: settings.commentTimeout,
    hideShorts: settings.hideShorts,
    tempAllowed,

    // Actions
    blockVideoComments,
    unblockVideoComments,
    isCommentsBlocked,
    tempAllowComments,
    getTempAllowExpiry,
    setCommentTimeout,
    toggleHideShorts,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
