import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../api/auth';
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();

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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
      <img src="/logo.png" alt="GoGo City" className="w-40 mb-2" style={{ marginLeft: '1px' }} />
      <p className="text-[10px] text-[var(--color-text-muted)] mb-8 uppercase tracking-widest">Explore. Complete. Level up.</p>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div>
          <label className="text-[10px] text-[var(--color-text-muted)] block mb-1 uppercase tracking-widest">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 text-sm" />
        </div>
        <div>
          <label className="text-[10px] text-[var(--color-text-muted)] block mb-1 uppercase tracking-widest">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 text-sm" />
        </div>

        {error && <p className="text-[var(--color-error)] text-xs">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[var(--color-primary)] text-white text-sm uppercase tracking-widest btn-retro disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Sign In'}
        </button>
      </form>

      <p className="mt-6 text-sm font-sans text-[var(--color-text-muted)]">
        New here?{' '}
        <Link to="/register" className="text-[var(--color-primary)] font-semibold hover:underline">
          Create account
        </Link>
      </p>
    </div>
  );
}
