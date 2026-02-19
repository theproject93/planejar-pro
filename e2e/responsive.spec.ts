import { expect, test, type Page } from '@playwright/test';
import { hasE2ECredentials, loginViaUI } from './auth';

const viewports = [
  { name: 'mobile-small', width: 360, height: 740 },
  { name: 'mobile-medium', width: 390, height: 844 },
  { name: 'mobile-large', width: 430, height: 932 },
];

async function expectNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 1;
  });
  expect(hasOverflow).toBeFalsy();
}

test.describe('Responsive smoke', () => {
  for (const vp of viewports) {
    test(`login page fits on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/login');
      await expect(page.getByRole('heading', { name: 'Acessar Conta' })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });

    test(`clients page fits on ${vp.name}`, async ({ page }) => {
      test.skip(!hasE2ECredentials(), 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated tests.');
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await loginViaUI(page);
      await page.goto('/dashboard/clientes');
      await expect(page.getByRole('heading', { name: 'Meus Clientes' })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }
});

