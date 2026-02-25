import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { register } from '../api/auth';
import { MapPin } from 'lucide-react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();

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
      <div className="flex items-center gap-3 mb-2">
        <MapPin size={28} className="text-[var(--color-primary)]" />
        <h1 className="text-2xl tracking-tight">GoGoCity</h1>
      </div>
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

      <p className="mt-6 text-sm font-sans text-[var(--color-text-muted)]">
        Already playing?{' '}
        <Link to="/login" className="text-[var(--color-primary)] font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
