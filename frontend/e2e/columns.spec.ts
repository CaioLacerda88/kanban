import { test, expect } from '@playwright/test';
import { login } from './fixtures';

test.describe('Column rename', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('clicking column header enters edit mode', async ({ page }) => {
    await page.getByRole('button', { name: 'Backlog' }).click();
    await expect(page.getByRole('textbox', { name: 'Rename column' })).toBeVisible();
    // Cancel to avoid committing
    await page.keyboard.press('Escape');
  });

  test('renaming with Enter: calls PUT /api/board/columns/:id', async ({ page }) => {
    const renameResponse = page.waitForResponse(
      (r) => /\/api\/board\/columns\/\d+/.test(r.url()) && r.request().method() === 'PUT',
    );

    await page.getByRole('button', { name: 'Backlog' }).click();
    const input = page.getByRole('textbox', { name: 'Rename column' });
    await input.fill('Sprint 1');
    await input.press('Enter');

    const res = await renameResponse;
    expect(res.status()).toBe(200);
    await expect(page.getByRole('button', { name: 'Sprint 1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Backlog' })).not.toBeVisible();

    // Restore original name so later tests find 'Backlog'
    const restoreResponse = page.waitForResponse(
      (r) => /\/api\/board\/columns\/\d+/.test(r.url()) && r.request().method() === 'PUT',
    );
    await page.getByRole('button', { name: 'Sprint 1' }).click();
    await page.getByRole('textbox', { name: 'Rename column' }).fill('Backlog');
    await page.keyboard.press('Enter');
    await restoreResponse;
  });

  test('renaming with blur: calls PUT /api/board/columns/:id', async ({ page }) => {
    const renameResponse = page.waitForResponse(
      (r) => /\/api\/board\/columns\/\d+/.test(r.url()) && r.request().method() === 'PUT',
    );

    await page.getByRole('button', { name: 'To Do' }).click();
    const input = page.getByRole('textbox', { name: 'Rename column' });
    await input.fill('Planned');
    await input.press('Tab');

    const res = await renameResponse;
    expect(res.status()).toBe(200);
    await expect(page.getByRole('button', { name: 'Planned' })).toBeVisible();

    // Restore
    const restoreResponse = page.waitForResponse(
      (r) => /\/api\/board\/columns\/\d+/.test(r.url()) && r.request().method() === 'PUT',
    );
    await page.getByRole('button', { name: 'Planned' }).click();
    await page.getByRole('textbox', { name: 'Rename column' }).fill('To Do');
    await page.keyboard.press('Enter');
    await restoreResponse;
  });

  test('pressing Escape cancels the rename without API call', async ({ page }) => {
    await page.getByRole('button', { name: 'In Progress' }).click();
    const input = page.getByRole('textbox', { name: 'Rename column' });
    await input.fill('Some new name');
    await input.press('Escape');
    await expect(page.getByRole('button', { name: 'In Progress' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Some new name' })).not.toBeVisible();
  });
});
