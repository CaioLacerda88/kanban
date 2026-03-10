import { test, expect } from '@playwright/test';
import { login } from './fixtures';

test.describe('Drag and drop', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('reorders a card within the same column: calls PUT /api/board/cards/:id/move', async ({ page }) => {
    const backlogColumn = page.locator('[data-testid="column"][data-column-name="Backlog"]');
    const firstCard = backlogColumn.getByRole('button', { name: /Set up CI\/CD pipeline/ });
    const secondCard = backlogColumn.getByRole('button', { name: /Write API documentation/ });

    await firstCard.waitFor({ state: 'visible' });
    await secondCard.waitFor({ state: 'visible' });

    const firstBox = await firstCard.boundingBox();
    const secondBox = await secondCard.boundingBox();
    if (!firstBox || !secondBox) throw new Error('Could not get bounding boxes');

    const moveResponse = page.waitForResponse(
      (r) => /\/api\/board\/cards\/\d+\/move/.test(r.url()) && r.request().method() === 'PUT',
    );

    await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
    await page.mouse.down();
    const targetY = secondBox.y + secondBox.height + 10;
    for (let i = 1; i <= 15; i++) {
      await page.mouse.move(
        firstBox.x + firstBox.width / 2,
        firstBox.y + firstBox.height / 2 + (targetY - firstBox.y - firstBox.height / 2) * (i / 15),
      );
    }
    await page.mouse.up();

    const res = await moveResponse;
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Card should still be in Backlog (column_id = 1)
    expect(body.column_id).toBe(1);

    // Both cards remain in Backlog
    await expect(backlogColumn.getByRole('button', { name: /Set up CI\/CD pipeline/ })).toBeVisible();
    await expect(backlogColumn.getByRole('button', { name: /Write API documentation/ })).toBeVisible();
  });

  test('moves a card to a different column: calls PUT /api/board/cards/:id/move with new column_id', async ({ page }) => {
    const card = page.getByRole('button', { name: /Add dark mode support/ });
    const toDoColumn = page.locator('[data-testid="column"][data-column-name="To Do"]');

    await card.waitFor({ state: 'visible' });
    await toDoColumn.waitFor({ state: 'visible' });

    const cardBox = await card.boundingBox();
    const toDoBox = await toDoColumn.boundingBox();
    if (!cardBox || !toDoBox) throw new Error('Could not get bounding boxes');

    const moveResponse = page.waitForResponse(
      (r) => /\/api\/board\/cards\/\d+\/move/.test(r.url()) && r.request().method() === 'PUT',
    );

    const startX = cardBox.x + cardBox.width / 2;
    const startY = cardBox.y + cardBox.height / 2;
    const targetX = toDoBox.x + toDoBox.width / 2;
    const targetY = toDoBox.y + 80;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let i = 1; i <= 20; i++) {
      await page.mouse.move(
        startX + (targetX - startX) * (i / 20),
        startY + (targetY - startY) * (i / 20),
      );
    }
    await page.mouse.up();

    const res = await moveResponse;
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Card should be in To Do (column_id = 2)
    expect(body.column_id).toBe(2);

    await expect(toDoColumn.getByRole('button', { name: /Add dark mode support/ })).toBeVisible();
  });
});
