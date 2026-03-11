'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  refresh: () => void;
}

export function useBoard(): UseBoardReturn {
  const [state, setState] = useState<BoardState>({ columns: [], cards: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Always-current ref so action callbacks can capture prev state without stale closures
  const stateRef = useRef(state);
  stateRef.current = state;

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
      const prev = stateRef.current;
      setState({
        ...prev,
        columns: prev.columns.map((col) => (col.id === columnId ? { ...col, name } : col)),
      });
      api.renameColumn(columnId, name).catch(() => setState(prev));
    },
    [],
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
      const prev = stateRef.current;
      setState({ ...prev, cards: { ...prev.cards, [cardId]: { ...prev.cards[cardId], ...patch } } });
      api.updateCard(cardId, patch).catch(() => setState(prev));
    },
    [],
  );

  const deleteCard = useCallback(
    (cardId: string) => {
      const prev = stateRef.current;
      const { [cardId]: _, ...cards } = prev.cards;
      setState({
        ...prev,
        cards,
        columns: prev.columns.map((col) => ({
          ...col,
          cardIds: col.cardIds.filter((id) => id !== cardId),
        })),
      });
      api.deleteCard(cardId).catch(() => setState(prev));
    },
    [],
  );

  const moveCard = useCallback(
    (cardId: string, toColumnId: string, toIndex: number) => {
      const prev = stateRef.current;
      setState(moveFn(prev, cardId, toColumnId, toIndex));
      api.moveCard(cardId, toColumnId, toIndex).catch(() => setState(prev));
    },
    [],
  );

  return {
    state,
    actions: { renameColumn, addCard, updateCard, deleteCard, moveCard },
    loading,
    error,
    refresh: loadBoard,
  };
}
