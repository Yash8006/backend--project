import { useState, useEffect } from 'react';

/**
 * InstallPWA — shows a subtle install banner when the browser fires
 * the `beforeinstallprompt` event (Chrome/Edge on Android and Desktop).
 *
 * iOS Safari does not fire this event; those users see "Add to Home Screen"
 * in the share sheet. We show them a small hint instead.
 */
export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner]         = useState(false);
  const [showIOSHint, setShowIOSHint]       = useState(false);
  const [dismissed, setDismissed]           = useState(false);

  useEffect(() => {
    // Don't show if already dismissed this session
    if (sessionStorage.getItem('pwa-banner-dismissed')) return;

    // Detect iOS Safari (no beforeinstallprompt support)
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;

    if (isInStandaloneMode) return; // already installed

    if (isIOS) {
      setShowIOSHint(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSHint(false);
    setDismissed(true);
    sessionStorage.setItem('pwa-banner-dismissed', '1');
  };

  if (dismissed || (!showBanner && !showIOSHint)) return null;

  return (
    <div style={styles.banner} role="banner" aria-label="Install app banner">
      {/* Icon */}
      <img src="/pwa-192x192.png" alt="VideoTube" style={styles.icon} />

      {/* Text */}
      <div style={styles.text}>
        <span style={styles.title}>Install VideoTube</span>
        <span style={styles.subtitle}>
          {showIOSHint
            ? 'Tap Share → Add to Home Screen'
            : 'Add to your home screen for the best experience'}
        </span>
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        {showBanner && (
          <button id="pwa-install-btn" style={styles.installBtn} onClick={handleInstall}>
            Install
          </button>
        )}
        <button
          id="pwa-dismiss-btn"
          style={styles.dismissBtn}
          onClick={handleDismiss}
          aria-label="Dismiss install banner"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

const styles = {
  banner: {
    position:       'fixed',
    bottom:         '16px',
    left:           '50%',
    transform:      'translateX(-50%)',
    display:        'flex',
    alignItems:     'center',
    gap:            '12px',
    background:     'linear-gradient(135deg, #1e1b4b 0%, #2d1b69 100%)',
    border:         '1px solid rgba(124, 58, 237, 0.4)',
    borderRadius:   '16px',
    padding:        '12px 16px',
    boxShadow:      '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.2)',
    backdropFilter: 'blur(20px)',
    zIndex:         9999,
    maxWidth:       '380px',
    width:          'calc(100vw - 32px)',
    animation:      'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  icon: {
    width:        '44px',
    height:       '44px',
    borderRadius: '10px',
    flexShrink:   0,
  },
  text: {
    display:       'flex',
    flexDirection: 'column',
    flex:          1,
    minWidth:      0,
  },
  title: {
    color:      '#fff',
    fontWeight: 700,
    fontSize:   '14px',
    lineHeight: 1.3,
  },
  subtitle: {
    color:      'rgba(255,255,255,0.6)',
    fontSize:   '12px',
    marginTop:  '2px',
    lineHeight: 1.4,
  },
  actions: {
    display:    'flex',
    alignItems: 'center',
    gap:        '8px',
    flexShrink: 0,
  },
  installBtn: {
    background:   'linear-gradient(135deg, #7c3aed, #6d28d9)',
    color:        '#fff',
    border:       'none',
    borderRadius: '8px',
    padding:      '8px 16px',
    fontSize:     '13px',
    fontWeight:   600,
    cursor:       'pointer',
    whiteSpace:   'nowrap',
    transition:   'opacity 0.2s',
  },
  dismissBtn: {
    background:   'transparent',
    color:        'rgba(255,255,255,0.5)',
    border:       'none',
    borderRadius: '6px',
    padding:      '4px 8px',
    fontSize:     '16px',
    cursor:       'pointer',
    lineHeight:   1,
    transition:   'color 0.2s',
  },
};
