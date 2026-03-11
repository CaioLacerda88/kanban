'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { LogOut } from 'lucide-react';
import type { BoardState, Card as CardType } from '@/types/kanban';
import type { BoardActions } from '@/hooks/useBoard';
import { resolveDrop } from '@/lib/dnd-utils';
import Column from './Column';
import ThemeToggle from './ThemeToggle';

interface Props {
  state: BoardState;
  actions: BoardActions;
  onLogout?: () => void;
}

export default function Board({ state, actions, onLogout }: Props) {
  const [activeCard, setActiveCard] = useState<CardType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    const card = state.cards[active.id as string];
    if (card) setActiveCard(card);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveCard(null);
    if (!over || active.id === over.id) return;
    const result = resolveDrop(state, active.id as string, over.id as string);
    if (result) actions.moveCard(active.id as string, result.toColumnId, result.toIndex);
  };

  const totalCards = state.columns.reduce((n, c) => n + c.cardIds.length, 0);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col">
        {/* Header */}
        <header className="px-6 py-4 flex items-center gap-3 shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700/60 shadow-sm dark:shadow-none">
          <div className="w-1 h-6 bg-accent-yellow rounded-full" />
          <h1 className="text-slate-900 dark:text-white font-bold text-lg tracking-tight">Project Board</h1>
          <span className="ml-auto text-slate-400 dark:text-slate-500 text-xs font-medium tabular-nums">
            {totalCards} {totalCards === 1 ? 'card' : 'cards'}
          </span>
          <ThemeToggle />
          {onLogout && (
            <button
              onClick={onLogout}
              aria-label="Sign out"
              title="Sign out"
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <LogOut size={16} />
            </button>
          )}
        </header>

        {/* Board */}
        <main className="flex-1 px-6 pt-6 pb-8 overflow-x-auto">
          <div className="flex gap-4 h-full min-w-max">
            {state.columns.map((col) => {
              const cards = col.cardIds.map((id) => state.cards[id]).filter(Boolean);
              return (
                <Column
                  key={col.id}
                  column={col}
                  cards={cards}
                  actions={actions}
                />
              );
            })}
          </div>
        </main>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCard ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg border-l-4 border-accent-yellow shadow-2xl px-4 py-3 w-72 rotate-2 opacity-95 cursor-grabbing">
            <p className="text-slate-900 dark:text-slate-100 text-sm font-medium leading-snug line-clamp-3">{activeCard.title}</p>
            {activeCard.details && (
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">{activeCard.details}</p>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
