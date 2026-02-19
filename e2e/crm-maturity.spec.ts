import { expect, test, type Page } from '@playwright/test';
import { hasE2ECredentials, loginViaUI } from './auth';

async function openClientsPage(page: Page) {
  await loginViaUI(page);
  await page.goto('/dashboard/clientes');
  await expect(page.getByRole('heading', { name: 'Meus Clientes' })).toBeVisible();
}

test.describe('CRM maturity smoke', () => {
  test('requires E2E credentials in CI', async () => {
    test.skip(!process.env.CI, 'Only enforced in CI.');
    expect(
      hasE2ECredentials(),
      'CI must define E2E_EMAIL and E2E_PASSWORD secrets.'
    ).toBeTruthy();
  });

  test('redirects anonymous user to login', async ({ page }) => {
    await page.goto('/dashboard/clientes');
    await page.waitForURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Acessar Conta' })).toBeVisible();
  });

  test('renders mature CRM modules for authenticated user', async ({ page }) => {
    test.skip(!hasE2ECredentials(), 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated tests.');

    await openClientsPage(page);
    await expect(page.getByText('Saude operacional (Fase 4)')).toBeVisible();
    await expect(page.getByText('Forecast do pipeline (Fase 5)')).toBeVisible();
    await expect(page.getByText('Fila de prioridade (Fase 5)')).toBeVisible();
    await expect(page.getByText('Execucao automatica (Fase 6)')).toBeVisible();
    await expect(page.getByText('Pesos de priorizacao')).toBeVisible();
  });

  test('allows opening clients pipeline cards', async ({ page }) => {
    test.skip(!hasE2ECredentials(), 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated tests.');

    await openClientsPage(page);

    const cards = page.locator('button').filter({ hasText: /Checklist: \d+\/\d+/ });
    if (await cards.count()) {
      await cards.first().click();
      await expect(page.getByText('Historico de estagios (Fase 4)')).toBeVisible();
      await expect(page.getByText('LGPD: consentimento e titular (Fase 3)')).toBeVisible();
    } else {
      await expect(page.getByText('Nenhum cliente encontrado.')).toBeVisible();
    }
  });

  test('creates lead and moves pipeline until closed', async ({ page }) => {
    test.skip(!hasE2ECredentials(), 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated tests.');

    await openClientsPage(page);

    const leadName = `E2E Lead ${Date.now()}`;

    await page.getByRole('button', { name: 'Novo cliente' }).click();
    await expect(page.getByText('Qual o tipo de evento?')).toBeVisible();
    await page.getByRole('button', { name: /Corporativo/ }).first().click();
    await page.getByRole('button', { name: 'Confirmar tipo' }).click();
    await page.locator('input[placeholder="Nome do cliente"]').fill(leadName);
    await page.getByRole('button', { name: /Salvar em Conhecendo cliente/ }).click();

    await expect(page.getByText(leadName).first()).toBeVisible();

    const prospectSection = page
      .locator('div.bg-white.rounded-2xl.border.border-gray-100.p-4.space-y-3')
      .filter({ hasText: 'Conhecendo cliente (prospeccao)' });
    await prospectSection.getByRole('button', { name: new RegExp(leadName) }).click();

    await expect(page.getByRole('heading', { name: /Prospeccao do cliente/i })).toBeVisible();
    await page.getByRole('button', { name: /Preparar/i }).click();
    await expect(page.getByText('Orcamento (Word/PDF)')).toBeVisible();

    const stageSelect = page.locator('select').first();
    await stageSelect.selectOption('assinatura_contrato');
    await expect(stageSelect).toHaveValue('assinatura_contrato');
    await expect(page.getByText('Contrato + pendente assinatura')).toBeVisible();

    await stageSelect.selectOption('cliente_fechado');
    await expect(stageSelect).toHaveValue('cliente_fechado');
  });

  test('autofills portfolio sender contacts from profile', async ({ page }) => {
    test.skip(!hasE2ECredentials(), 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated tests.');

    const officialName = `E2E Perfil ${Date.now()}`;
    const officialWhatsapp = '+55 11 98888-7777';
    const officialEmail = `e2e.perfil.${Date.now()}@mail.com`;
    const officialInstagram = '@e2eperfil';

    await loginViaUI(page);
    await page.goto('/dashboard/perfil');
    await expect(page.getByRole('heading', { name: 'Meu Perfil' })).toBeVisible();

    await page.getByPlaceholder('Nome completo').fill(officialName);
    await page.getByPlaceholder('Ex.: +55 11 99999-9999').fill(officialWhatsapp);
    await page.getByPlaceholder('contato@seunegocio.com').fill(officialEmail);
    await page.getByPlaceholder('@seuperfil').fill(officialInstagram);
    await page.getByRole('button', { name: /Salvar alteracoes|Salvando.../ }).click();
    await expect(page.getByText('Perfil atualizado com sucesso!')).toBeVisible();

    await page.goto('/dashboard/clientes');
    await expect(page.getByRole('heading', { name: 'Meus Clientes' })).toBeVisible();
    await page.getByRole('button', { name: 'Portfolio' }).click();
    await expect(page.getByRole('heading', { name: 'Portfolio' })).toBeVisible();

    await expect(page.getByPlaceholder('Seu nome')).toHaveValue(officialName);
    await expect(page.getByPlaceholder('Seu WhatsApp')).toHaveValue(officialWhatsapp);
    await expect(page.getByPlaceholder('Seu e-mail')).toHaveValue(officialEmail);
    await expect(page.getByPlaceholder('Seu Instagram')).toHaveValue(officialInstagram);
  });
});
