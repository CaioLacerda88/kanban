'use client';

import { useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Pencil, Plus } from 'lucide-react';
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
      <div
        className="flex flex-col w-72 min-w-72 bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-slate-900/50 overflow-hidden border border-slate-200/60 dark:border-slate-700/50"
        data-testid="column"
        data-column-name={column.name}
      >
        {/* Column header */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-2">
          {editing ? (
            <input
              ref={inputRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="flex-1 text-slate-900 dark:text-slate-100 font-semibold text-sm bg-white dark:bg-slate-700 border border-blue-primary dark:border-sky-500 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-primary/30 dark:focus:ring-sky-500/30"
              aria-label="Rename column"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="group/header flex-1 flex items-center gap-1.5 text-left text-slate-700 dark:text-slate-200 font-semibold text-sm hover:text-blue-primary dark:hover:text-sky-400 transition-colors truncate"
              title="Click to rename"
            >
              <span className="truncate">{column.name}</span>
              <Pencil
                size={11}
                className="shrink-0 opacity-0 group-hover/header:opacity-50 transition-opacity"
              />
            </button>
          )}
          <span className="text-slate-500 dark:text-slate-400 text-xs font-medium bg-slate-100 dark:bg-slate-700/60 rounded-full px-2 py-0.5 shrink-0 tabular-nums">
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
              transition-colors duration-150 rounded-lg
              ${isOver ? 'bg-sky-50 dark:bg-sky-900/20' : ''}
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
        <div className="px-3 py-3 border-t border-slate-100 dark:border-slate-700/50">
          <button
            onClick={() => setAddingCard(true)}
            className="w-full text-left text-slate-400 dark:text-slate-500 text-sm hover:text-blue-primary dark:hover:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg px-3 py-2 transition-colors flex items-center gap-2"
          >
            <Plus size={14} />
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
