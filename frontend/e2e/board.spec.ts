import { test, expect } from '@playwright/test';
import { login } from './fixtures';

test.describe('Board', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('loads board from GET /api/board', async ({ page }) => {
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

  test('renames column: calls PUT /api/board/columns/:id and updates UI', async ({ page }) => {
    // Set up response listener BEFORE the action
    const renameResponse = page.waitForResponse(
      (r) => /\/api\/board\/columns\/\d+/.test(r.url()) && r.request().method() === 'PUT',
    );

    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await page.getByLabel('Rename column').fill('Completed');
    await page.keyboard.press('Enter');

    const res = await renameResponse;
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Completed');
    await expect(page.getByRole('button', { name: 'Completed', exact: true })).toBeVisible();

    // Restore original name so later tests are unaffected
    const restoreResponse = page.waitForResponse(
      (r) => /\/api\/board\/columns\/\d+/.test(r.url()) && r.request().method() === 'PUT',
    );
    await page.getByRole('button', { name: 'Completed', exact: true }).click();
    await page.getByLabel('Rename column').fill('Done');
    await page.keyboard.press('Enter');
    await restoreResponse;
  });
});
