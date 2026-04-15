import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login, googleLogin } from '../api/auth';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();
  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        setError('');
        setLoading(true);
        try {
          const { access_token } = await googleLogin(response.credential);
          auth.login(access_token);
          navigate('/');
        } catch (err: any) {
          setError(err.response?.data?.detail || 'Google sign-in failed');
        } finally {
          setLoading(false);
        }
      },
    });

    if (googleBtnRef.current) {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'filled_black',
        size: 'large',
        width: googleBtnRef.current.offsetWidth,
        text: 'signin_with',
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { access_token } = await login(email, password);
      auth.login(access_token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{
        background: '#ffffff',
      }}
    >

      <img src="/logo.png" alt="GoGo City" className="w-72 mb-1 relative z-10 drop-shadow-lg" />

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div>
          <label
            style={{
              fontFamily: "'Bangers', cursive",
              fontSize: '13px',
              letterSpacing: '0.2em',
              color: '#fb923c',
              display: 'block',
              marginBottom: '6px',
            }}
          >
            EMAIL
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="login-input w-full px-4 py-3 text-sm"
          />
        </div>
        <div>
          <label
            style={{
              fontFamily: "'Bangers', cursive",
              fontSize: '13px',
              letterSpacing: '0.2em',
              color: '#fb923c',
              display: 'block',
              marginBottom: '6px',
            }}
          >
            PASSWORD
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="login-input w-full px-4 py-3 text-sm"
          />
        </div>

        {error && (
          <p style={{ color: '#fca5a5', fontSize: '12px', marginTop: '4px' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: loading
              ? 'rgba(180, 80, 0, 0.5)'
              : 'linear-gradient(135deg, #f97316 0%, #dc2626 60%, #991b1b 100%)',
            border: '2px solid rgba(255, 150, 50, 0.6)',
            borderRadius: '6px',
            boxShadow: loading ? 'none' : '0 0 20px rgba(249, 115, 22, 0.5), 3px 3px 0px rgba(0,0,0,0.5)',
            color: '#fff',
            fontFamily: "'Bangers', cursive",
            fontSize: '18px',
            letterSpacing: '0.2em',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {loading ? 'LOADING...' : 'SIGN IN'}
        </button>
      </form>

      <div className="w-full flex items-center gap-3 my-5">
        <div style={{ flex: 1, borderTop: '1px solid rgba(251, 146, 60, 0.25)' }} />
        <span
          style={{
            fontFamily: "'Bangers', cursive",
            fontSize: '11px',
            letterSpacing: '0.2em',
            color: 'rgba(251, 146, 60, 0.6)',
          }}
        >
          OR
        </span>
        <div style={{ flex: 1, borderTop: '1px solid rgba(251, 146, 60, 0.25)' }} />
      </div>

      {/* Hidden Google button needed for SDK to work */}
      <div ref={googleBtnRef} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px', overflow: 'hidden' }} />

      <button
        type="button"
        onClick={() => window.google?.accounts.id.prompt()}
        style={{
          width: '100%',
          padding: '14px',
          background: 'linear-gradient(135deg, #f97316 0%, #dc2626 60%, #991b1b 100%)',
          border: '2px solid rgba(255, 150, 50, 0.6)',
          borderRadius: '6px',
          boxShadow: '0 0 20px rgba(249, 115, 22, 0.5), 3px 3px 0px rgba(0,0,0,0.5)',
          color: '#fff',
          fontFamily: "'Bangers', cursive",
          fontSize: '18px',
          letterSpacing: '0.2em',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        SIGN IN WITH GOOGLE
      </button>

      <p
        style={{
          marginTop: '24px',
          fontSize: '13px',
          color: '#1a1a1a',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        New here?{' '}
        <Link
          to="/register"
          style={{
            color: '#fb923c',
            fontWeight: 700,
            textDecoration: 'none',
            textShadow: '0 0 8px rgba(251, 146, 60, 0.4)',
          }}
        >
          Create account
        </Link>
      </p>
    </div>
  );
}
