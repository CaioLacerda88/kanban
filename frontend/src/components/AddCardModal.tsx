'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface Props {
  columnName: string;
  onAdd: (title: string, details: string) => void;
  onClose: () => void;
}

export default function AddCardModal({ columnName, onAdd, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useFocusTrap();
  const titleId = useId();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), details.trim());
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
      <div className="modal-content relative z-10 w-full max-w-md mx-4 bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden border border-slate-200/80 dark:border-slate-700/60">
        <div className="h-1 bg-purple-secondary dark:bg-violet-500" />
        <div className="p-6">
          <div className="flex items-start justify-between mb-1">
            <h2 id={titleId} className="text-slate-900 dark:text-slate-100 font-semibold text-lg">Add card</h2>
            <button
              onClick={onClose}
              className="modal-close-btn"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          <p className="text-slate-400 dark:text-slate-500 text-sm mb-5">Adding to: {columnName}</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="form-label" htmlFor="card-title">
                Title
              </label>
              <input
                ref={inputRef}
                id="card-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="input-field"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="card-details">
                Details <span className="text-slate-400 dark:text-slate-500 font-normal">(optional)</span>
              </label>
              <textarea
                id="card-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Add more context..."
                rows={4}
                className="input-field resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                className="px-5 py-2 text-sm font-medium text-white bg-purple-secondary hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Add card
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
