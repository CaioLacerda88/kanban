import type { NextConfig } from 'next';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';

export default function config(phase: string): NextConfig {
  const isExporting = phase === PHASE_PRODUCTION_BUILD;

  return {
    reactStrictMode: true,
    ...(isExporting
      ? { output: 'export' }
      : {
          async rewrites() {
            return [
              { source: '/api/:path*', destination: 'http://localhost:8000/api/:path*' },
            ];
          },
        }),
  };
}
