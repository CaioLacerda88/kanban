import { test, expect } from './fixtures';

test.describe('Board', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page loads and shows the board header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Project Board' })).toBeVisible();
  });

  test('all 5 columns are visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Backlog' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'To Do' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'In Progress' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Review', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Done' })).toBeVisible();
  });

  test('seed data cards are visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Set up CI\/CD pipeline/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Design onboarding flow/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Refactor authentication module/ })).toBeVisible();
  });

  test('card count is shown in the header', async ({ page }) => {
    await expect(page.getByText(/\d+ cards?/)).toBeVisible();
  });
});
