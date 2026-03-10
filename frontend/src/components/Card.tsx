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
          group bg-white rounded-lg border-l-4 border-blue-primary shadow-sm px-4 py-3
          cursor-grab active:cursor-grabbing select-none
          hover:shadow-md hover:border-accent-yellow
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
        <p className="text-dark-navy text-sm font-medium leading-snug line-clamp-3">{card.title}</p>
        {card.details && (
          <p className="text-gray-text text-xs mt-1.5 line-clamp-2 leading-relaxed">{card.details}</p>
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
