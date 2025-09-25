import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/Header';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { username: username.trim(), password });
      const token = res.data?.token;
      if (token) {
        localStorage.setItem('token', token);
        navigate('/');
      } else {
        setError('Invalid response from server');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center p-4 pt-20">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-card p-6 rounded-md shadow">
        <h1 className="text-2xl font-bold mb-4 text-foreground">Login</h1>
        <div className="mb-3">
          <label className="block text-sm mb-1">Username</label>
          <input
            className="w-full border rounded px-3 py-2 bg-background text-foreground"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm mb-1">Password</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2 bg-background text-foreground"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
        <p className="mt-3 text-xs text-muted-foreground">Default: admin / admin123</p>
        <p className="mt-1 text-xs text-muted-foreground">
          No account? <Link to="/register" className="text-blue-600 underline">Create one</Link>
        </p>
      </form>
      </div>
    </div>
  );
}
