'use client';

import { useBoard } from '@/hooks/useBoard';
import Board from './Board';

export default function KanbanApp() {
  const { state, actions } = useBoard();
  return <Board state={state} actions={actions} />;
}
