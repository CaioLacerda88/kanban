'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card as CardType } from '@/types/kanban';
import CardModal from './CardModal';

interface Props {
  card: CardType;
  columnName: string;
  onUpdate: (patch: Partial<Omit<CardType, 'id'>>) => void;
  onDelete: () => void;
}

export default function Card({ card, columnName, onUpdate, onDelete }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => !isDragging && setModalOpen(true)}
        className={`
          group bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700/50
          border-l-4 border-l-blue-primary dark:border-l-sky-500 shadow-sm px-4 py-3
          cursor-grab active:cursor-grabbing select-none
          hover:shadow-md hover:border-l-accent-yellow dark:hover:border-l-amber-400
          hover:border-slate-300 dark:hover:border-slate-600
          transition-all duration-150
          ${isDragging ? 'opacity-40 shadow-xl' : ''}
        `}
        role="button"
        tabIndex={0}
        aria-label={`Open card: ${card.title}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setModalOpen(true);
          }
        }}
      >
        <p className="text-slate-800 dark:text-slate-100 text-sm font-medium leading-snug line-clamp-3">{card.title}</p>
        {card.details && (
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">{card.details}</p>
        )}
      </div>

      {modalOpen && (
        <CardModal
          card={card}
          columnName={columnName}
          onSave={onUpdate}
          onDelete={onDelete}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
