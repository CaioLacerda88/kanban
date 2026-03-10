'use client';

import { useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Card as CardType, Column as ColumnType } from '@/types/kanban';
import type { BoardActions } from '@/hooks/useBoard';
import Card from './Card';
import AddCardModal from './AddCardModal';

interface Props {
  column: ColumnType;
  cards: CardType[];
  actions: BoardActions;
}

export default function Column({ column, cards, actions }: Props) {
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(column.name);
  const [addingCard, setAddingCard] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurRef = useRef(false);

  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  // Keep local value in sync if column is renamed externally
  useEffect(() => {
    if (!editing) setNameValue(column.name);
  }, [column.name, editing]);

  const commitRename = () => {
    const trimmed = nameValue.trim();
    if (trimmed) actions.renameColumn(column.id, trimmed);
    else setNameValue(column.name);
    setEditing(false);
  };

  const cancelRename = () => {
    setNameValue(column.name);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { skipBlurRef.current = true; commitRename(); }
    if (e.key === 'Escape') { skipBlurRef.current = true; cancelRename(); }
  };

  const handleBlur = () => {
    if (skipBlurRef.current) { skipBlurRef.current = false; return; }
    commitRename();
  };

  return (
    <>
      <div className="flex flex-col w-72 min-w-72 bg-gray-50 rounded-xl shadow-sm overflow-hidden" data-testid="column" data-column-name={column.name}>
        {/* Column header */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-2">
          {editing ? (
            <input
              ref={inputRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="flex-1 text-dark-navy font-semibold text-sm bg-white border border-blue-primary rounded px-2 py-0.5 focus:outline-none"
              aria-label="Rename column"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="group/header flex-1 flex items-center gap-1.5 text-left text-dark-navy font-semibold text-sm hover:text-blue-primary transition-colors truncate"
              title="Click to rename"
            >
              <span className="truncate">{column.name}</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="currentColor"
                className="shrink-0 opacity-0 group-hover/header:opacity-50 transition-opacity"
              >
                <path d="M9.707 0.293a1 1 0 00-1.414 0L1 7.586V11h3.414l7.293-7.293a1 1 0 000-1.414l-2-2zM2.5 9.5v-1.086l5-5 1.086 1.086-5 5H2.5z" />
              </svg>
            </button>
          )}
          <span className="text-gray-text text-xs font-medium bg-gray-200 rounded-full px-2 py-0.5 shrink-0">
            {cards.length}
          </span>
        </div>

        {/* Accent line */}
        <div className="h-0.5 bg-accent-yellow mx-4 rounded-full mb-3" />

        {/* Card list */}
        <SortableContext items={column.cardIds} strategy={verticalListSortingStrategy}>
          <div
            ref={setNodeRef}
            className={`
              flex-1 px-3 overflow-y-auto max-h-[calc(100vh-220px)] flex flex-col gap-2 pb-3 min-h-16
              transition-colors duration-150
              ${isOver ? 'bg-blue-50' : ''}
            `}
          >
            {cards.map((card) => (
              <Card
                key={card.id}
                card={card}
                columnName={column.name}
                onUpdate={(patch) => actions.updateCard(card.id, patch)}
                onDelete={() => actions.deleteCard(card.id)}
              />
            ))}
          </div>
        </SortableContext>

        {/* Add card button */}
        <div className="px-3 py-3 border-t border-gray-100">
          <button
            onClick={() => setAddingCard(true)}
            className="w-full text-left text-gray-text text-sm hover:text-blue-primary hover:bg-white rounded-lg px-3 py-2 transition-colors flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M7 1a1 1 0 011 1v4h4a1 1 0 110 2H8v4a1 1 0 11-2 0V8H2a1 1 0 110-2h4V2a1 1 0 011-1z" />
            </svg>
            Add card
          </button>
        </div>
      </div>

      {addingCard && (
        <AddCardModal
          columnName={column.name}
          onAdd={(title, details) => {
            actions.addCard(column.id, { title, details });
            setAddingCard(false);
          }}
          onClose={() => setAddingCard(false)}
        />
      )}
    </>
  );
}
