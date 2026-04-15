import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { register, googleLogin } from '../api/auth';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
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
        theme: 'outline',
        size: 'large',
        width: googleBtnRef.current.offsetWidth,
        text: 'signup_with',
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { access_token } = await register(email, username, password, displayName || undefined);
      auth.login(access_token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
      <img src="/logo.png" alt="GoGo City" className="w-40 mb-1" />
      <p className="text-[10px] text-[var(--color-text-muted)] mb-8 uppercase tracking-widest">Join the quest</p>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div>
          <label className="text-[10px] text-[var(--color-text-muted)] block mb-1 uppercase tracking-widest">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 text-sm" />
        </div>
        <div>
          <label className="text-[10px] text-[var(--color-text-muted)] block mb-1 uppercase tracking-widest">Username</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} className="w-full px-4 py-3 text-sm" />
        </div>
        <div>
          <label className="text-[10px] text-[var(--color-text-muted)] block mb-1 uppercase tracking-widest">Display Name</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Optional" className="w-full px-4 py-3 text-sm" />
        </div>
        <div>
          <label className="text-[10px] text-[var(--color-text-muted)] block mb-1 uppercase tracking-widest">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="w-full px-4 py-3 text-sm" />
        </div>

        {error && <p className="text-[var(--color-error)] text-xs">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[var(--color-primary)] text-white text-sm uppercase tracking-widest btn-retro disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Account'}
        </button>
      </form>

      <div className="w-full flex items-center gap-3 my-5">
        <div className="flex-1 border-t border-[var(--color-border)]" />
        <span className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-widest">or</span>
        <div className="flex-1 border-t border-[var(--color-border)]" />
      </div>

      <div ref={googleBtnRef} className="w-full" />

      <p className="mt-6 text-sm font-sans text-[var(--color-text-muted)]">
        Already playing?{' '}
        <Link to="/login" className="text-[var(--color-primary)] font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
