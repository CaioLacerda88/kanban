'use client';

import { FormEvent, useState } from 'react';

interface Props {
  onLogin: (username: string) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError('Invalid username or password');
        return;
      }
      const data = await res.json();
      onLogin(data.username);
    } catch {
      setError('Could not connect to server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-xl shadow-md dark:shadow-slate-900/60 p-8 border border-slate-200/60 dark:border-slate-700/50">
        <div className="flex items-center gap-2.5 mb-7">
          <div className="w-1 h-7 bg-accent-yellow rounded-full" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sign in</h1>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-primary/40 dark:focus:ring-sky-500/40 focus:border-blue-primary dark:focus:border-sky-500 transition-shadow"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-primary/40 dark:focus:ring-sky-500/40 focus:border-blue-primary dark:focus:border-sky-500 transition-shadow"
            />
          </div>
          {error && (
            <p role="alert" className="text-red-500 dark:text-red-400 text-sm">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-purple-secondary hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white font-semibold rounded-lg px-4 py-2.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
