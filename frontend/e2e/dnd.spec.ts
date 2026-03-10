import { test, expect } from '@playwright/test';

test.describe('Drag and drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('drag a card from one column to another', async ({ page }) => {
    const card = page.getByRole('button', { name: /Set up CI\/CD pipeline/ });
    const toDoColumn = page.locator('[data-testid="column"][data-column-name="To Do"]');

    const cardBox = await card.boundingBox();
    const toDoBox = await toDoColumn.boundingBox();
    if (!cardBox || !toDoBox) throw new Error('Could not get bounding boxes');

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

    // Card must now be inside the To Do column
    await expect(toDoColumn.getByRole('button', { name: /Set up CI\/CD pipeline/ })).toBeVisible();
  });

  test('drag a card within the same column to reorder', async ({ page }) => {
    const backlogColumn = page.locator('[data-testid="column"][data-column-name="Backlog"]');
    const firstCard = backlogColumn.getByRole('button', { name: /Set up CI\/CD pipeline/ });
    const secondCard = backlogColumn.getByRole('button', { name: /Define API contracts/ });

    const firstBox = await firstCard.boundingBox();
    const secondBox = await secondCard.boundingBox();
    if (!firstBox || !secondBox) throw new Error('Could not get bounding boxes');

    const startX = firstBox.x + firstBox.width / 2;
    const startY = firstBox.y + firstBox.height / 2;
    const targetY = secondBox.y + secondBox.height + 10;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let i = 1; i <= 15; i++) {
      await page.mouse.move(startX, startY + (targetY - startY) * (i / 15));
    }
    await page.mouse.up();

    // Both cards remain in the Backlog column
    await expect(backlogColumn.getByRole('button', { name: /Set up CI\/CD pipeline/ })).toBeVisible();
    await expect(backlogColumn.getByRole('button', { name: /Define API contracts/ })).toBeVisible();
  });
});
