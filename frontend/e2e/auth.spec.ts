import { test, expect } from '@playwright/test';

test.describe('Auth', () => {
  test('shows login page when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('shows error on wrong credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Username').fill('user');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText('Invalid username or password')).toBeVisible();
  });

  test('redirects to board after successful login', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Username').fill('user');
    await page.getByLabel('Password').fill('password');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByRole('heading', { name: 'Project Board' })).toBeVisible();
  });

  test('sign out returns to login page', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Username').fill('user');
    await page.getByLabel('Password').fill('password');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.getByRole('heading', { name: 'Project Board' }).waitFor();
    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });
});
