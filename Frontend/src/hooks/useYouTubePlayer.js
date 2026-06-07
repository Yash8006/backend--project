import { useEffect, useRef, useCallback } from 'react';

/**
 * useYouTubePlayer
 *
 * Manages the full YouTube IFrame Player API lifecycle:
 *  1. Injects the <script> tag once globally (idempotent)
 *  2. Waits for window.onYouTubeIframeAPIReady
 *  3. Creates YT.Player in the returned containerRef
 *  4. Tracks cumulative watch seconds (only counts PLAYING time)
 *  5. Fires onWatchThreshold callback when watchThresholdSeconds is reached
 *  6. Cleans up player on unmount
 *
 * @param {string}   videoId              - YouTube video ID (e.g. "dQw4w9WgXcQ")
 * @param {number}   watchThresholdSeconds - Seconds of watch time before history is saved (default: 30)
 * @param {Function} onWatchThreshold     - Callback fired once when threshold is met
 * @param {Function} onEnded              - Callback fired when video finishes
 * @returns {{ containerRef: React.RefObject }}
 */
export default function useYouTubePlayer({
  videoId,
  watchThresholdSeconds = 30,
  onWatchThreshold,
  onEnded,
}) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const timerRef = useRef(null);          // setInterval handle
  const watchedSecondsRef = useRef(0);    // cumulative seconds watched
  const thresholdFiredRef = useRef(false); // ensure callback fires only once

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => {
      watchedSecondsRef.current += 1;
      if (
        !thresholdFiredRef.current &&
        watchedSecondsRef.current >= watchThresholdSeconds
      ) {
        thresholdFiredRef.current = true;
        stopTimer();
        onWatchThreshold?.();
      }
    }, 1000);
  }, [watchThresholdSeconds, onWatchThreshold, stopTimer]);

  const handleStateChange = useCallback(
    (event) => {
      const YT = window.YT;
      if (!YT) return;

      switch (event.data) {
        case YT.PlayerState.PLAYING:
          startTimer();
          break;

        case YT.PlayerState.PAUSED:
        case YT.PlayerState.BUFFERING:
          stopTimer();
          break;

        case YT.PlayerState.ENDED:
          stopTimer();
          // Fire threshold if not already fired
          if (!thresholdFiredRef.current) {
            thresholdFiredRef.current = true;
            onWatchThreshold?.();
          }
          onEnded?.();
          break;

        default:
          break;
      }
    },
    [startTimer, stopTimer, onWatchThreshold, onEnded]
  );

  useEffect(() => {
    if (!videoId) return;

    // Reset state when videoId changes
    stopTimer();
    watchedSecondsRef.current = 0;
    thresholdFiredRef.current = false;

    /**
     * Creates the YT.Player once the API is ready.
     * Called either immediately (if API already loaded) or via the global callback.
     */
    const createPlayer = () => {
      if (!containerRef.current) return;

      // Destroy existing player if switching videos
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch (_) {}
        playerRef.current = null;
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,        // Start playing immediately
          rel: 0,             // Don't show unrelated videos at end
          modestbranding: 1,  // Smaller YouTube logo
          fs: 1,              // Allow fullscreen
          playsinline: 1,     // iOS: play inline, not fullscreen
        },
        events: {
          onStateChange: handleStateChange,
          onError: (e) => console.warn('YouTube player error:', e.data),
        },
      });
    };

    // ── Script loading ────────────────────────────────────────────────────────
    if (window.YT && window.YT.Player) {
      // API already loaded (navigated to a second YouTube video)
      createPlayer();
    } else if (!window._ytApiLoading) {
      // First time — inject the script tag
      window._ytApiLoading = true;
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      document.head.appendChild(tag);

      // YouTube calls this global function when ready
      window.onYouTubeIframeAPIReady = () => {
        window._ytApiLoading = false;
        createPlayer();
      };
    } else {
      // Script is currently loading — queue our callback
      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousReady?.();
        createPlayer();
      };
    }

    return () => {
      stopTimer();
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch (_) {}
        playerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return { containerRef };
}
