'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, boardFromApi } from '@/lib/api';
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
  loading: boolean;
  error: string | null;
}

export function useBoard(): UseBoardReturn {
  const [state, setState] = useState<BoardState>({ columns: [], cards: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBoard = useCallback(async () => {
    try {
      const data = await api.getBoard();
      setState(boardFromApi(data));
      setError(null);
    } catch {
      setError('Failed to load board');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const renameColumn = useCallback(
    (columnId: string, name: string) => {
      setState((s) => ({
        ...s,
        columns: s.columns.map((col) => (col.id === columnId ? { ...col, name } : col)),
      }));
      api.renameColumn(columnId, name).catch(loadBoard);
    },
    [loadBoard],
  );

  const addCard = useCallback(
    (columnId: string, card: Omit<Card, 'id'>) => {
      api
        .createCard(columnId, card.title, card.details)
        .then((newCard) => {
          const id = `card-${newCard.id}`;
          setState((s) => ({
            ...s,
            cards: {
              ...s.cards,
              [id]: { id, title: newCard.title, details: newCard.details ?? undefined },
            },
            columns: s.columns.map((col) =>
              col.id === columnId ? { ...col, cardIds: [...col.cardIds, id] } : col,
            ),
          }));
        })
        .catch(loadBoard);
    },
    [loadBoard],
  );

  const updateCard = useCallback(
    (cardId: string, patch: Partial<Omit<Card, 'id'>>) => {
      setState((s) => ({
        ...s,
        cards: { ...s.cards, [cardId]: { ...s.cards[cardId], ...patch } },
      }));
      api.updateCard(cardId, patch).catch(loadBoard);
    },
    [loadBoard],
  );

  const deleteCard = useCallback(
    (cardId: string) => {
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
      api.deleteCard(cardId).catch(loadBoard);
    },
    [loadBoard],
  );

  const moveCard = useCallback(
    (cardId: string, toColumnId: string, toIndex: number) => {
      setState((s) => moveFn(s, cardId, toColumnId, toIndex));
      api.moveCard(cardId, toColumnId, toIndex).catch(loadBoard);
    },
    [loadBoard],
  );

  return {
    state,
    actions: { renameColumn, addCard, updateCard, deleteCard, moveCard },
    loading,
    error,
  };
}
