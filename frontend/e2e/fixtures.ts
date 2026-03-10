import { test as base, expect } from '@playwright/test';

// Extends the base test with a pre-authenticated page so board tests
// don't depend on having a running backend.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('/api/auth/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ username: 'user' }),
      })
    );
    await use(page);
  },
});

export { expect };
