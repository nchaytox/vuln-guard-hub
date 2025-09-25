import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/Header';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/register`, { username: username.trim(), password });
      const token = res.data?.token;
      if (token) {
        localStorage.setItem('token', token);
        navigate('/');
      } else {
        setError('Invalid response from server');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center p-4 pt-20">
        <form onSubmit={onSubmit} className="w-full max-w-sm bg-card p-6 rounded-md shadow">
        <h1 className="text-2xl font-bold mb-4 text-foreground">Create Account</h1>
        <div className="mb-3">
          <label className="block text-sm mb-1">Username</label>
          <input
            className="w-full border rounded px-3 py-2 bg-background text-foreground"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-1">Password</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2 bg-background text-foreground"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm mb-1">Confirm Password</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2 bg-background text-foreground"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
          />
        </div>
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
        <p className="mt-3 text-xs text-muted-foreground">
          Already have an account? <Link to="/login" className="text-blue-600 underline">Sign in</Link>
        </p>
        </form>
      </div>
    </div>
  );
}
