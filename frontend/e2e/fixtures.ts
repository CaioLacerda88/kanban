import { Page } from '@playwright/test';

export { test, expect } from '@playwright/test';

/** Log in as the default test user via the real /api/auth/login endpoint. */
export async function login(page: Page) {
  await page.goto('/');
  await page.getByLabel('Username').fill('user');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: /sign in/i }).click();
  // Wait until the board heading appears — confirms auth + board load from API
  await page.getByRole('heading', { name: 'Project Board' }).waitFor();
}
