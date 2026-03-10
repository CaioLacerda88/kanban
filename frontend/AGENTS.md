# Frontend Agent Guide

This document describes the existing Next.js frontend for AI agents working on this codebase.

## Overview

A Kanban board MVP built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, and dnd-kit for drag-and-drop. Currently a pure frontend demo with in-memory state — no backend calls yet.

## Directory Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx          Server component; renders <KanbanAppLoader />
│   │   ├── layout.tsx        Root layout with metadata
│   │   └── globals.css       Tailwind v4 @theme block with project colors
│   ├── components/
│   │   ├── KanbanAppLoader.tsx  Dynamic import with ssr: false (prevents nanoid hydration mismatch)
│   │   ├── KanbanApp.tsx        Calls useBoard(), renders <Board />
│   │   ├── Board.tsx            DndContext + DragOverlay; renders columns
│   │   ├── Column.tsx           SortableContext; renders cards in a column
│   │   ├── Card.tsx             Sortable card; opens CardModal on click
│   │   ├── CardModal.tsx        Edit/delete card modal
│   │   └── AddCardModal.tsx     Create new card modal
│   ├── hooks/
│   │   ├── useBoard.ts       All board state and mutations (see State Management below)
│   │   └── useFocusTrap.ts   Traps keyboard focus inside modals for accessibility
│   ├── lib/
│   │   └── dnd-utils.ts      moveCard(), resolveDrop(), findColumnOfCard() helpers
│   ├── types/
│   │   └── kanban.ts         Card, Column, BoardState interfaces
│   └── data/
│       └── seed.ts           createInitialState() — 5 columns, 15 sample cards
├── __tests__/                Jest unit/component tests (53 tests)
├── e2e/                      Playwright e2e tests (17 tests)
├── __mocks__/
│   └── nanoid.js             CommonJS mock for ESM-only nanoid package
├── package.json
├── jest.config.ts
├── playwright.config.ts
└── next.config.ts
```

## Key Architectural Patterns

### SSR Avoidance
`page.tsx` is a Server Component that renders `<KanbanAppLoader />`. That loader uses `next/dynamic` with `ssr: false` to load `<KanbanApp />` client-side only. This prevents hydration mismatches because `nanoid()` generates different IDs on server vs client.

Do not move board state or nanoid calls into server-rendered code.

### State Shape
```typescript
interface BoardState {
  columns: Column[];         // ordered array — column order is preserved here
  cards: Record<string, Card>; // flat lookup map by card id
}

interface Column {
  id: string;
  name: string;
  cardIds: string[];         // ordered — card order within column
}

interface Card {
  id: string;
  title: string;
  details?: string;
}
```

Cards are stored flat in `cards` and referenced by ID in `column.cardIds[]`. Always update both when creating, deleting, or moving cards.

### State Management — useBoard

`src/hooks/useBoard.ts` exports `useBoard()` which returns `{ state, actions }`.

```typescript
interface BoardActions {
  renameColumn(columnId: string, name: string): void;
  addCard(columnId: string, card: Omit<Card, 'id'>): void;
  updateCard(cardId: string, patch: Partial<Omit<Card, 'id'>>): void;
  deleteCard(cardId: string): void;
  moveCard(cardId: string, toColumnId: string, toIndex: number): void;
}
```

When integrating the backend (Part 7), this hook will be updated to call API routes on each mutation. Keep the same `BoardActions` interface — callers (`KanbanApp`, `Board`, `Column`, `Card`) should not need to change.

### Drag and Drop
- `Board.tsx` sets up `DndContext` with `PointerSensor` (8px activation distance) and `KeyboardSensor`
- `Column.tsx` wraps cards in `SortableContext` (vertical list strategy)
- `Card.tsx` uses `useSortable`
- Drop logic lives in `src/lib/dnd-utils.ts`: `resolveDrop()` determines target column and index from the drag event, then calls `actions.moveCard()`

## Color Scheme

Defined in `src/app/globals.css` as Tailwind v4 `@theme` variables. Use these CSS variable names in components:

| Variable | Hex | Use |
|---|---|---|
| `--color-accent-yellow` | `#ecad0a` | Accent lines, highlights |
| `--color-blue-primary` | `#209dd7` | Links, key sections |
| `--color-purple-secondary` | `#753991` | Submit buttons, important actions |
| `--color-dark-navy` | `#032147` | Main headings |
| `--color-gray-text` | `#888888` | Supporting text, labels |

In Tailwind classes use: `text-accent-yellow`, `bg-blue-primary`, `border-purple-secondary`, etc.

## Testing

### Unit/Component Tests (Jest)
- **53 tests** in `__tests__/`
- Run: `npm test`
- Config: `jest.config.ts` with `jsdom` environment and `ts-jest`
- nanoid is mocked in `__mocks__/nanoid.js` (CJS shim for ESM package)
- When adding components, add corresponding tests in `__tests__/`

### E2E Tests (Playwright)
- **17 tests** in `e2e/`
- Run: `npm run test:e2e`
- Currently targets `http://localhost:3000` (dev server)
- After Part 2, update `playwright.config.ts` base URL to target the Docker container

### Other scripts
- `npm run dev` — start dev server at http://localhost:3000
- `npm run build` — static export to `out/` (after `output: 'export'` is added in Part 3)
- `npm run typecheck` — TypeScript check without emitting
- `npm run lint` — ESLint

## What Changes in Upcoming Parts

| Part | Changes to frontend |
|---|---|
| 3 | Add `output: 'export'` to `next.config.ts` |
| 4 | Add `LoginPage` component, `useAuth` hook, logout button |
| 7 | Add `src/lib/api.ts`, update `useBoard` to call backend, add loading state |
| 10 | Add `AISidebar` component, `useAIChat` hook, board refresh callback |
