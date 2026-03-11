'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { Card } from '@/types/kanban';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface Props {
  card: Card;
  columnName: string;
  onSave: (patch: Partial<Omit<Card, 'id'>>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function CardModal({ card, columnName, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(card.title);
  const [details, setDetails] = useState(card.details ?? '');
  const [confirming, setConfirming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useFocusTrap();
  const titleId = useId();

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
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="modal-backdrop absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="modal-content relative z-10 w-full max-w-lg mx-4 bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden border border-slate-200/80 dark:border-slate-700/60">
        <div className="h-1 bg-blue-primary dark:bg-sky-500" />
        <div className="p-6">
          <div className="flex items-start justify-between mb-1">
            <h2 id={titleId} className="text-slate-900 dark:text-slate-100 font-semibold text-lg">Edit card</h2>
            <button
              onClick={onClose}
              className="modal-close-btn"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          <p className="text-slate-400 dark:text-slate-500 text-sm mb-5">{columnName}</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className="form-label" htmlFor="edit-title">
                Title
              </label>
              <input
                ref={inputRef}
                id="edit-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="edit-details">
                Details
              </label>
              <textarea
                id="edit-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={5}
                placeholder="Add details..."
                className="input-field resize-none"
              />
            </div>
          </div>

          {confirming ? (
            <div className="mt-6 pt-4 border-t border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 -mx-6 -mb-6 px-6 pb-6 rounded-b-xl">
              <p className="text-slate-800 dark:text-slate-200 font-medium text-sm">Delete this card?</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5 mb-4">This cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirming(false)}
                  className="btn-ghost"
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
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/60">
              <button
                onClick={() => setConfirming(true)}
                className="px-4 py-2 text-sm font-medium text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                Delete card
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!title.trim()}
                  className="px-5 py-2 text-sm font-medium text-white bg-purple-secondary hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
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
