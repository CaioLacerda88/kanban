import { test as base, expect } from '@playwright/test';

const BOARD_MOCK = {
  id: 1,
  name: 'Project Board',
  columns: [
    {
      id: 1, board_id: 1, name: 'Backlog', position: 0,
      cards: [
        { id: 1,  column_id: 1, title: 'Set up CI/CD pipeline',           details: 'Configure GitHub Actions', position: 0 },
        { id: 2,  column_id: 1, title: 'Write API documentation',          details: 'Document all REST endpoints', position: 1 },
        { id: 3,  column_id: 1, title: 'Add dark mode support',            details: 'CSS variables toggle',       position: 2 },
      ],
    },
    {
      id: 2, board_id: 1, name: 'To Do', position: 1,
      cards: [
        { id: 4,  column_id: 2, title: 'Design onboarding flow',           details: 'Wireframes', position: 0 },
        { id: 5,  column_id: 2, title: 'Implement search feature',         details: 'Full-text search', position: 1 },
        { id: 6,  column_id: 2, title: 'Add keyboard shortcuts',           details: 'Power users', position: 2 },
      ],
    },
    {
      id: 3, board_id: 1, name: 'In Progress', position: 2,
      cards: [
        { id: 7,  column_id: 3, title: 'Refactor authentication module',   details: 'JWT migration', position: 0 },
        { id: 8,  column_id: 3, title: 'Optimize database queries',        details: 'Add indexes',   position: 1 },
        { id: 9,  column_id: 3, title: 'Build notification system',        details: 'Real-time',     position: 2 },
      ],
    },
    {
      id: 4, board_id: 1, name: 'Review', position: 3,
      cards: [
        { id: 10, column_id: 4, title: 'Code review: payment integration', details: 'PR review', position: 0 },
        { id: 11, column_id: 4, title: 'Test mobile responsiveness',       details: 'iOS Android', position: 1 },
        { id: 12, column_id: 4, title: 'Security audit',                   details: 'Auth review', position: 2 },
      ],
    },
    {
      id: 5, board_id: 1, name: 'Done', position: 4,
      cards: [
        { id: 13, column_id: 5, title: 'Set up project repository',        details: 'Monorepo',   position: 0 },
        { id: 14, column_id: 5, title: 'Create initial database schema',   details: 'SQLite',     position: 1 },
        { id: 15, column_id: 5, title: 'Deploy staging environment',       details: 'Docker',     position: 2 },
      ],
    },
  ],
};

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('/api/auth/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ username: 'user' }),
      })
    );

    await page.route('/api/board', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(BOARD_MOCK),
        });
      } else {
        route.continue();
      }
    });

    await page.route('/api/board/cards', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 999,
            column_id: body.column_id,
            title: body.title,
            details: body.details ?? null,
            position: 99,
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.route('/api/board/columns/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 1, board_id: 1, name: 'renamed', position: 0 }),
      })
    );

    await page.route('/api/board/cards/**', async (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 1, column_id: 1, title: 'ok', details: null, position: 0 }),
        });
      }
    });

    await use(page);
  },
});

export { expect };
