'use client';

import dynamic from 'next/dynamic';

const AppRoot = dynamic(() => import('./AppRoot'), { ssr: false });

export default function KanbanAppLoader() {
  return <AppRoot />;
}
