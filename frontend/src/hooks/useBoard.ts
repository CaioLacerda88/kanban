'use client';

import { useCallback, useState } from 'react';
import { nanoid } from 'nanoid';
import { createInitialState } from '@/data/seed';
import { moveCard as moveFn } from '@/lib/dnd-utils';
import type { BoardState, Card } from '@/types/kanban';

export interface BoardActions {
  renameColumn: (columnId: string, name: string) => void;
  addCard: (columnId: string, card: Omit<Card, 'id'>) => void;
  updateCard: (cardId: string, patch: Partial<Omit<Card, 'id'>>) => void;
  deleteCard: (cardId: string) => void;
  moveCard: (cardId: string, toColumnId: string, toIndex: number) => void;
}

export interface UseBoardReturn {
  state: BoardState;
  actions: BoardActions;
}

export function useBoard(): UseBoardReturn {
  const [state, setState] = useState<BoardState>(createInitialState);

  const renameColumn = useCallback((columnId: string, name: string) => {
    setState((s) => ({
      ...s,
      columns: s.columns.map((col) =>
        col.id === columnId ? { ...col, name } : col
      ),
    }));
  }, []);

  const addCard = useCallback((columnId: string, card: Omit<Card, 'id'>) => {
    const newCard: Card = { id: nanoid(), ...card };
    setState((s) => ({
      ...s,
      cards: { ...s.cards, [newCard.id]: newCard },
      columns: s.columns.map((col) =>
        col.id === columnId
          ? { ...col, cardIds: [...col.cardIds, newCard.id] }
          : col
      ),
    }));
  }, []);

  const updateCard = useCallback((cardId: string, patch: Partial<Omit<Card, 'id'>>) => {
    setState((s) => ({
      ...s,
      cards: {
        ...s.cards,
        [cardId]: { ...s.cards[cardId], ...patch },
      },
    }));
  }, []);

  const deleteCard = useCallback((cardId: string) => {
    setState((s) => {
      const { [cardId]: _, ...cards } = s.cards;
      return {
        ...s,
        cards,
        columns: s.columns.map((col) => ({
          ...col,
          cardIds: col.cardIds.filter((id) => id !== cardId),
        })),
      };
    });
  }, []);

  const moveCard = useCallback((cardId: string, toColumnId: string, toIndex: number) => {
    setState((s) => moveFn(s, cardId, toColumnId, toIndex));
  }, []);

  return {
    state,
    actions: { renameColumn, addCard, updateCard, deleteCard, moveCard },
  };
}
