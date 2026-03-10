import { test, expect } from '@playwright/test';
import { login } from './fixtures';

test.describe('Cards', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('clicking Add card opens the add modal', async ({ page }) => {
    const backlogColumn = page.locator('[data-testid="column"][data-column-name="Backlog"]');
    await backlogColumn.getByRole('button', { name: /Add card/ }).click();
    await expect(page.getByRole('dialog', { name: 'Add card' })).toBeVisible();
  });

  test('closing add modal via Cancel does not add a card', async ({ page }) => {
    const backlogColumn = page.locator('[data-testid="column"][data-column-name="Backlog"]');
    await backlogColumn.getByRole('button', { name: /Add card/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Add card' });
    await dialog.getByLabel('Title').fill('Should not appear');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('button', { name: /Should not appear/ })).not.toBeVisible();
  });

  test('clicking a card opens the edit modal', async ({ page }) => {
    await page.getByRole('button', { name: /Build notification system/ }).click();
    await expect(page.getByRole('dialog', { name: 'Edit card' })).toBeVisible();
  });

  test('closing edit modal via Escape discards changes', async ({ page }) => {
    await page.getByRole('button', { name: /Build notification system/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit card' });
    await dialog.getByLabel('Title').fill('Changed title');
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Build notification system/ })).toBeVisible();
  });

  test('adding a card: calls POST /api/board/cards and appends to column', async ({ page }) => {
    const backlogColumn = page.locator('[data-testid="column"][data-column-name="Backlog"]');
    const createResponse = page.waitForResponse(
      (r) => r.url().endsWith('/api/board/cards') && r.request().method() === 'POST',
    );

    await backlogColumn.getByRole('button', { name: /Add card/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Add card' });
    await dialog.getByLabel('Title').fill('My new test card');
    await dialog.getByRole('button', { name: 'Add card' }).click();

    const res = await createResponse;
    expect(res.status()).toBe(201);
    const card = await res.json();
    expect(card.title).toBe('My new test card');

    await expect(page.getByRole('button', { name: /My new test card/ })).toBeVisible();
  });

  test('editing a card: calls PUT /api/board/cards/:id and updates UI', async ({ page }) => {
    const updateResponse = page.waitForResponse(
      (r) => /\/api\/board\/cards\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() === 'PUT',
    );

    await page.getByRole('button', { name: /Optimize database queries/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit card' });
    await dialog.getByLabel('Title').fill('Updated DB queries');
    await dialog.getByRole('button', { name: 'Save' }).click();

    const res = await updateResponse;
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Updated DB queries');

    await expect(page.getByRole('button', { name: /Updated DB queries/ })).toBeVisible();
  });

  test('deleting a card: calls DELETE /api/board/cards/:id and removes from board', async ({ page }) => {
    const deleteResponse = page.waitForResponse(
      (r) => /\/api\/board\/cards\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() === 'DELETE',
    );

    await page.getByRole('button', { name: /Security audit/ }).click();
    const modal = page.getByRole('dialog', { name: 'Edit card' });
    await modal.getByRole('button', { name: 'Delete card' }).click();
    await expect(page.getByText('Delete this card?')).toBeVisible();
    await modal.getByRole('button', { name: 'Delete' }).click();

    const res = await deleteResponse;
    expect(res.status()).toBe(200);

    await expect(page.getByRole('button', { name: /Security audit/ })).not.toBeVisible();
  });
});
