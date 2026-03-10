'use client';

import { useBoard } from '@/hooks/useBoard';
import Board from './Board';

interface Props {
  onLogout?: () => void;
}

export default function KanbanApp({ onLogout }: Props) {
  const { state, actions, loading, error } = useBoard();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-navy flex items-center justify-center">
        <p className="text-white/50 text-sm">Loading board…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-navy flex items-center justify-center">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return <Board state={state} actions={actions} onLogout={onLogout} />;
}
