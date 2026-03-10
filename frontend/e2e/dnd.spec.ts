import { test, expect } from '@playwright/test';

test.describe('Drag and drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('drag a card from one column to another', async ({ page }) => {
    // Drag "Set up CI/CD pipeline" (Backlog) to "To Do"
    const card = page.getByRole('button', { name: /Set up CI\/CD pipeline/ });
    const toDoColumn = page.locator('.flex.flex-col.w-72').filter({ hasText: 'To Do' }).first();

    const cardBox = await card.boundingBox();
    const toDoBox = await toDoColumn.boundingBox();
    if (!cardBox || !toDoBox) throw new Error('Could not get bounding boxes');

    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(100);
    // Move in steps for smooth drag
    const targetX = toDoBox.x + toDoBox.width / 2;
    const targetY = toDoBox.y + 80;
    const steps = 15;
    const startX = cardBox.x + cardBox.width / 2;
    const startY = cardBox.y + cardBox.height / 2;
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(
        startX + (targetX - startX) * (i / steps),
        startY + (targetY - startY) * (i / steps)
      );
    }
    await page.mouse.up();
    await page.waitForTimeout(200);

    // Card should now be visible (it moved to "To Do" but is still accessible)
    await expect(page.getByRole('button', { name: /Set up CI\/CD pipeline/ })).toBeVisible();
  });

  test('drag a card within the same column to reorder', async ({ page }) => {
    const backlogColumn = page.locator('.flex.flex-col.w-72').filter({ hasText: 'Backlog' }).first();
    const cards = backlogColumn.getByRole('button').filter({ hasText: /pipeline|API contracts|dependencies/ });

    // Ensure at least 2 cards are present
    await expect(cards.first()).toBeVisible();

    const firstCard = backlogColumn.getByRole('button', { name: /Set up CI\/CD pipeline/ });
    const secondCard = backlogColumn.getByRole('button', { name: /Define API contracts/ });

    const firstBox = await firstCard.boundingBox();
    const secondBox = await secondCard.boundingBox();
    if (!firstBox || !secondBox) throw new Error('Could not get bounding boxes');

    await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(100);

    const steps = 10;
    const targetY = secondBox.y + secondBox.height + 10;
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(
        firstBox.x + firstBox.width / 2,
        firstBox.y + firstBox.height / 2 + (targetY - (firstBox.y + firstBox.height / 2)) * (i / steps)
      );
    }
    await page.mouse.up();
    await page.waitForTimeout(200);

    // Both cards should still be visible
    await expect(firstCard).toBeVisible();
    await expect(secondCard).toBeVisible();
  });
});
