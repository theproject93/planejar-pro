import { expect, Page } from '@playwright/test';

export const E2E_EMAIL = process.env.E2E_EMAIL ?? '';
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? '';

export function hasE2ECredentials() {
  return Boolean(E2E_EMAIL && E2E_PASSWORD);
}

export async function loginViaUI(page: Page) {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Acessar Conta' })).toBeVisible();

  await page.locator('input[type="email"]').fill(E2E_EMAIL);
  await page.locator('input[type="password"]').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Entrar na Plataforma' }).click();

  await page.waitForURL(/\/dashboard/);
  await expect(page).toHaveURL(/\/dashboard/);
}
