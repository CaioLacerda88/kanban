'use client';

import { useEffect, useId, useRef, useState } from 'react';
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
        className="modal-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="modal-content relative z-10 w-full max-w-md mx-4 bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="h-1 bg-purple-secondary" />
        <div className="p-6">
          <h2 id={titleId} className="text-dark-navy font-semibold text-lg mb-1">Add card</h2>
          <p className="text-gray-text text-sm mb-5">Adding to: {columnName}</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-navy mb-1" htmlFor="card-title">
                Title
              </label>
              <input
                ref={inputRef}
                id="card-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-dark-navy placeholder-gray-text focus:outline-none focus:ring-2 focus:ring-blue-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-navy mb-1" htmlFor="card-details">
                Details <span className="text-gray-text font-normal">(optional)</span>
              </label>
              <textarea
                id="card-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Add more context..."
                rows={4}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-dark-navy placeholder-gray-text focus:outline-none focus:ring-2 focus:ring-blue-primary focus:border-transparent resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-text hover:text-dark-navy transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                className="px-5 py-2 text-sm font-medium text-white bg-purple-secondary rounded-lg hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
