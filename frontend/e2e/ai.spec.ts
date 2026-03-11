import { test, expect } from '@playwright/test';
import { login } from './fixtures';

test.describe('AI Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('toggle button is visible after login', async ({ page }) => {
    await expect(page.getByRole('button', { name: /open ai chat/i })).toBeVisible();
  });

  test('opens sidebar on toggle click', async ({ page }) => {
    await page.getByRole('button', { name: /open ai chat/i }).click();
    await expect(page.getByRole('heading', { name: /ai assistant/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /message input/i })).toBeVisible();
  });

  test('closes sidebar on second toggle click', async ({ page }) => {
    await page.getByRole('button', { name: /open ai chat/i }).click();
    await expect(page.getByRole('heading', { name: /ai assistant/i })).toBeVisible();

    await page.getByRole('button', { name: /close ai chat/i }).click();
    await expect(page.getByRole('heading', { name: /ai assistant/i })).not.toBeVisible();
  });

  test('sends a message and calls POST /api/ai/chat', async ({ page }) => {
    test.setTimeout(90_000);
    await page.getByRole('button', { name: /open ai chat/i }).click();

    const aiResponse = page.waitForResponse(
      (r) => r.url().endsWith('/api/ai/chat') && r.request().method() === 'POST',
      { timeout: 80_000 },
    );

    await page.getByRole('textbox', { name: /message input/i }).fill('What is on my board?');
    await page.getByRole('button', { name: /send message/i }).click();

    const res = await aiResponse;
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('board_updated');

    // AI reply appears in the sidebar
    await expect(page.getByText(data.message)).toBeVisible();
  });
});
