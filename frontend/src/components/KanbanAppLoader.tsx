'use client';

import dynamic from 'next/dynamic';

const KanbanApp = dynamic(() => import('./KanbanApp'), { ssr: false });

export default function KanbanAppLoader() {
  return <KanbanApp />;
}
