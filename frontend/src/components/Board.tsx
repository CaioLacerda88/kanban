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
import type { BoardState, Card as CardType } from '@/types/kanban';
import type { BoardActions } from '@/hooks/useBoard';
import { resolveDrop } from '@/lib/dnd-utils';
import Column from './Column';

interface Props {
  state: BoardState;
  actions: BoardActions;
}

export default function Board({ state, actions }: Props) {
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
      <div className="min-h-screen bg-dark-navy flex flex-col">
        {/* Header */}
        <header className="px-8 py-5 flex items-center gap-3 shrink-0 border-b border-white/5">
          <div className="w-1 h-7 bg-accent-yellow rounded-full" />
          <h1 className="text-white font-bold text-xl tracking-tight">Project Board</h1>
          <span className="ml-auto text-white/30 text-xs font-medium tabular-nums">
            {totalCards} {totalCards === 1 ? 'card' : 'cards'}
          </span>
        </header>

        {/* Board */}
        <main className="flex-1 px-8 pt-6 pb-8 overflow-x-auto">
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
          <div className="bg-white rounded-lg border-l-4 border-accent-yellow shadow-2xl px-4 py-3 w-72 rotate-2 opacity-95 cursor-grabbing">
            <p className="text-dark-navy text-sm font-medium leading-snug line-clamp-3">{activeCard.title}</p>
            {activeCard.details && (
              <p className="text-gray-text text-xs mt-1.5 line-clamp-2 leading-relaxed">{activeCard.details}</p>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
