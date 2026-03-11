'use client';

import { useEffect, useState } from 'react';
import KanbanApp from './KanbanApp';
import LoginPage from './LoginPage';

export default function AppRoot() {
  // undefined = checking, null = not authenticated, string = username
  const [user, setUser] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/me', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data?.username ?? null))
      .catch((e) => { if (e.name !== 'AbortError') setUser(null); });
    return () => controller.abort();
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--color-blue-primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }
  if (user === null) return <LoginPage onLogin={setUser} />;
  return <KanbanApp onLogout={handleLogout} />;
}
