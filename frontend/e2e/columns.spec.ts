import { test, expect } from '@playwright/test';

test.describe('Column rename', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('clicking column header enters edit mode', async ({ page }) => {
    await page.getByRole('button', { name: 'Backlog' }).click();
    await expect(page.getByRole('textbox', { name: 'Rename column' })).toBeVisible();
  });

  test('renaming a column with Enter commits the change', async ({ page }) => {
    await page.getByRole('button', { name: 'Backlog' }).click();
    const input = page.getByRole('textbox', { name: 'Rename column' });
    await input.fill('Sprint 1');
    await input.press('Enter');
    await expect(page.getByRole('button', { name: 'Sprint 1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Backlog' })).not.toBeVisible();
  });

  test('renaming a column with blur commits the change', async ({ page }) => {
    await page.getByRole('button', { name: 'To Do' }).click();
    const input = page.getByRole('textbox', { name: 'Rename column' });
    await input.fill('Planned');
    await input.press('Tab');
    await expect(page.getByRole('button', { name: 'Planned' })).toBeVisible();
  });

  test('pressing Escape cancels the rename', async ({ page }) => {
    await page.getByRole('button', { name: 'In Progress' }).click();
    const input = page.getByRole('textbox', { name: 'Rename column' });
    await input.fill('Some new name');
    await input.press('Escape');
    await expect(page.getByRole('button', { name: 'In Progress' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Some new name' })).not.toBeVisible();
  });
});
