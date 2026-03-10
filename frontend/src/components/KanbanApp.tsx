'use client';

import { useBoard } from '@/hooks/useBoard';
import Board from './Board';

interface Props {
  onLogout?: () => void;
}

export default function KanbanApp({ onLogout }: Props) {
  const { state, actions } = useBoard();
  return <Board state={state} actions={actions} onLogout={onLogout} />;
}
