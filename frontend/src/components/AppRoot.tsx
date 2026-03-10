'use client';

import { useEffect, useState } from 'react';
import KanbanApp from './KanbanApp';
import LoginPage from './LoginPage';

export default function AppRoot() {
  // undefined = checking, null = not authenticated, string = username
  const [user, setUser] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data?.username ?? null))
      .catch(() => setUser(null));
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }

  if (user === undefined) return null;
  if (user === null) return <LoginPage onLogin={setUser} />;
  return <KanbanApp onLogout={handleLogout} />;
}
