import { nanoid } from 'nanoid';
import type { BoardState, Card, Column } from '@/types/kanban';

function makeCard(title: string, details: string): Card {
  return { id: nanoid(), title, details };
}

export function createInitialState(): BoardState {
  const backlogCards = [
    makeCard(
      'Set up CI/CD pipeline',
      'Configure GitHub Actions for automated testing and deployment. Include lint, test, and build steps.'
    ),
    makeCard(
      'Define API contracts',
      'Draft OpenAPI spec for all endpoints. Agree on request/response shapes with the frontend team before implementation.'
    ),
    makeCard(
      'Audit dependencies',
      'Review all third-party packages for security vulnerabilities and remove any that are unused or unmaintained.'
    ),
  ];

  const todoCards = [
    makeCard(
      'Design onboarding flow',
      'Wireframe the new user onboarding experience. Focus on reducing time-to-value to under 5 minutes.'
    ),
    makeCard(
      'Implement dark mode',
      'Add theme toggle using CSS custom properties. Persist user preference in localStorage.'
    ),
    makeCard(
      'Write migration scripts',
      'Create SQL migration files for the new schema changes introduced in v2.3. Include rollback scripts.'
    ),
  ];

  const inProgressCards = [
    makeCard(
      'Refactor authentication module',
      'Replace the legacy JWT handling with the new Auth SDK. Ensure all session edge cases are covered by tests.'
    ),
    makeCard(
      'Fix payment gateway timeout',
      'Transactions are timing out after 10s on the Stripe integration. Increase timeout and add exponential backoff.'
    ),
  ];

  const reviewCards = [
    makeCard(
      'Update privacy policy page',
      'Legal team has approved the new copy. Update the page and add the effective date banner.'
    ),
    makeCard(
      'Optimize image loading',
      'Switch product images to WebP format and implement lazy loading. Target LCP under 2.5s.'
    ),
    makeCard(
      'Add rate limiting to API',
      'Implement per-IP rate limiting using Redis. Limits: 100 req/min for public endpoints, 1000 req/min for authenticated.'
    ),
  ];

  const doneCards = [
    makeCard(
      'Upgrade to Node 22',
      'All services updated and tested on Node 22 LTS. Deprecated APIs replaced. Deployed to production on 2026-03-01.'
    ),
    makeCard(
      'Launch beta program',
      'Invited 50 beta users. Feedback collected via in-app survey. Summary shared with the product team.'
    ),
  ];

  const allCards = [
    ...backlogCards,
    ...todoCards,
    ...inProgressCards,
    ...reviewCards,
    ...doneCards,
  ];

  const columns: Column[] = [
    { id: nanoid(), name: 'Backlog', cardIds: backlogCards.map((c) => c.id) },
    { id: nanoid(), name: 'To Do', cardIds: todoCards.map((c) => c.id) },
    { id: nanoid(), name: 'In Progress', cardIds: inProgressCards.map((c) => c.id) },
    { id: nanoid(), name: 'Review', cardIds: reviewCards.map((c) => c.id) },
    { id: nanoid(), name: 'Done', cardIds: doneCards.map((c) => c.id) },
  ];

  const cards: Record<string, Card> = {};
  for (const card of allCards) {
    cards[card.id] = card;
  }

  return { columns, cards };
}
