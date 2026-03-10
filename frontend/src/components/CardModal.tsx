'use client';

import { useEffect, useRef, useState } from 'react';
import type { Card } from '@/types/kanban';

interface Props {
  card: Card;
  columnName: string;
  onSave: (patch: Partial<Omit<Card, 'id'>>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function CardModal({ card, columnName, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(card.title);
  const [details, setDetails] = useState(card.details);
  const [confirming, setConfirming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirming) setConfirming(false);
        else onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [confirming, onClose]);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), details: details.trim() });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Edit card"
    >
      <div
        className="modal-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="modal-content relative z-10 w-full max-w-lg mx-4 bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="h-1 bg-blue-primary" />
        <div className="p-6">
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-dark-navy font-semibold text-lg">Edit card</h2>
            <button
              onClick={onClose}
              className="text-gray-text hover:text-dark-navy transition-colors ml-4 mt-0.5"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
              </svg>
            </button>
          </div>
          <p className="text-gray-text text-sm mb-5">{columnName}</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-navy mb-1" htmlFor="edit-title">
                Title
              </label>
              <input
                ref={inputRef}
                id="edit-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-dark-navy focus:outline-none focus:ring-2 focus:ring-blue-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-navy mb-1" htmlFor="edit-details">
                Details
              </label>
              <textarea
                id="edit-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={5}
                placeholder="Add details..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-dark-navy placeholder-gray-text focus:outline-none focus:ring-2 focus:ring-blue-primary focus:border-transparent resize-none"
              />
            </div>
          </div>

          {confirming ? (
            <div className="mt-6 pt-4 border-t border-red-100 bg-red-50 -mx-6 -mb-6 px-6 pb-6 rounded-b-xl">
              <p className="text-dark-navy font-medium text-sm">Delete this card?</p>
              <p className="text-gray-text text-sm mt-0.5 mb-4">This cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirming(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-text hover:text-dark-navy transition-colors"
                >
                  Keep
                </button>
                <button
                  onClick={() => { onDelete(); onClose(); }}
                  className="px-5 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => setConfirming(true)}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                Delete card
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-text hover:text-dark-navy transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!title.trim()}
                  className="px-5 py-2 text-sm font-medium text-white bg-purple-secondary rounded-lg hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
