import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

/**
 * AuthCallback — landing page after Google OAuth redirect.
 *
 * The backend sets JWT cookies and redirects the browser here with:
 *   ?status=success   →  refetch user and go to home
 *   (anything else)   →  show error and redirect to login
 *
 * We use a ref guard so that refetchUser is only called once even in
 * React Strict Mode (which double-invokes effects in development).
 */
export default function AuthCallback() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const { refetchUser } = useAuth();
  const toast          = useToast();
  const hasRun         = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const status = searchParams.get('status');
    const error  = searchParams.get('error');

    if (status === 'success') {
      refetchUser()
        .then(() => {
          toast.success('Signed in with Google! 🎉');
          navigate('/', { replace: true });
        })
        .catch(() => {
          toast.error('Something went wrong. Please try again.');
          navigate('/login', { replace: true });
        });
    } else {
      toast.error(error === 'google_auth_failed'
        ? 'Google sign-in was cancelled or failed.'
        : 'Authentication failed. Please try again.');
      navigate('/login', { replace: true });
    }
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        minHeight:      '100vh',
        gap:            16,
        color:          'var(--text-muted)',
      }}
    >
      {/* Spinning ring */}
      <div
        style={{
          width:        48,
          height:       48,
          border:       '3px solid var(--border)',
          borderTop:    '3px solid var(--accent)',
          borderRadius: '50%',
          animation:    'spin 0.8s linear infinite',
        }}
      />
      <p style={{ fontSize: 15 }}>Completing sign-in…</p>

      {/* Inline keyframe so we don't need an extra CSS file */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
