import { test, expect } from '@playwright/test';

test.describe('Cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('clicking Add card opens the add modal', async ({ page }) => {
    const backlogColumn = page.locator('[data-testid="column"][data-column-name="Backlog"]');
    await backlogColumn.getByRole('button', { name: /Add card/ }).click();
    await expect(page.getByRole('dialog', { name: 'Add card' })).toBeVisible();
  });

  test('adding a card appends it to the column', async ({ page }) => {
    const backlogColumn = page.locator('[data-testid="column"][data-column-name="Backlog"]');
    await backlogColumn.getByRole('button', { name: /Add card/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Add card' });
    await dialog.getByLabel('Title').fill('My new test card');
    await dialog.getByRole('button', { name: 'Add card' }).click();
    await expect(page.getByRole('button', { name: /My new test card/ })).toBeVisible();
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
    await page.getByRole('button', { name: /Set up CI\/CD pipeline/ }).click();
    await expect(page.getByRole('dialog', { name: 'Edit card' })).toBeVisible();
  });

  test('editing a card title and saving updates the card', async ({ page }) => {
    await page.getByRole('button', { name: /Set up CI\/CD pipeline/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit card' });
    const titleInput = dialog.getByLabel('Title');
    await titleInput.fill('Updated CI pipeline');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('button', { name: /Updated CI pipeline/ })).toBeVisible();
  });

  test('deleting a card removes it from the board', async ({ page }) => {
    await page.getByRole('button', { name: /Set up CI\/CD pipeline/ }).click();
    const modal = page.getByRole('dialog', { name: 'Edit card' });
    await modal.getByRole('button', { name: 'Delete card' }).click();
    await expect(page.getByText('Delete this card?')).toBeVisible();
    await modal.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('button', { name: /Set up CI\/CD pipeline/ })).not.toBeVisible();
  });

  test('closing edit modal via Escape discards changes', async ({ page }) => {
    await page.getByRole('button', { name: /Set up CI\/CD pipeline/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit card' });
    await dialog.getByLabel('Title').fill('Changed title');
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Set up CI\/CD pipeline/ })).toBeVisible();
  });
});
