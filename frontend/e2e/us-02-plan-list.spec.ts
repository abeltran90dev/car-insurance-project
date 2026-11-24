import { expect, Page, test } from '@playwright/test';

// Plan names below are seed data (cms seed), as listed in SPEC-US-02 AC-01.
const SEED_PLANS: Record<string, string[]> = {
  co: ['Plan Básico', 'Plan Estándar', 'Plan Premium'],
  cl: ['Plan Esencial', 'Plan Full', 'Plan Full Plus'],
};

// Recommended plan per country (seed data).
const RECOMMENDED: Record<string, string> = { co: 'Plan Estándar', cl: 'Plan Full' };

const year = new Date().getFullYear() - 2;

// Fictitious, valid step 1 values per country (keys come from the seeded form configuration).
const STEP1: Record<string, Record<string, string | number | boolean>> = {
  co: {
    documentType: 'CC',
    documentNumber: '1111111111',
    firstName: 'Ana',
    lastName: 'Prueba',
    birthDate: '1990-01-15',
    email: 'ana.prueba@example.test',
    phone: '3001234567',
    city: 'bogota',
    acceptDataPolicy: true,
    plate: 'ABC123',
    brand: 'toyota',
    model: 'Modelo Uno',
    year,
    mileage: 12000,
  },
  cl: {
    firstName: 'Luis',
    lastName: 'Prueba',
    documentNumber: '11.111.111-1',
    birthDate: '1990-01-15',
    phone: '912345678',
    email: 'luis.prueba@example.test',
    city: 'santiago',
    plate: 'ABCD12',
    year,
    brand: 'toyota',
    model: 'Modelo Uno',
    mileage: 12000,
  },
};

/** Seeds a completed step 1 (ADR-004 storage shape) before the app boots; only if nothing is stored yet. */
async function seedStep1(page: Page, cc: string, planDocumentId: string | null = null) {
  const key = `quote:v1:${cc.toUpperCase()}`;
  const value = JSON.stringify({ v: 1, country: cc.toUpperCase(), values: STEP1[cc], planDocumentId });
  await page.addInitScript(
    ([k, v]) => {
      if (sessionStorage.getItem(k) === null) sessionStorage.setItem(k, v);
    },
    [key, value],
  );
}

const cards = (page: Page) => page.locator('[data-testid="plan-card"]');
const continueBtn = (page: Page) => page.getByRole('button', { name: 'Continuar' });

test.describe('US-02 plan list (e2e)', () => {
  for (const cc of ['co', 'cl']) {
    test(`US-02-AC-01 shows only active published plans in order (${cc})`, async ({ page }) => {
      await seedStep1(page, cc);
      await page.goto(`/${cc}/planes`);
      await expect(cards(page).first()).toBeVisible();
      await expect(page.locator('.plan__name')).toHaveText(SEED_PLANS[cc]);
      await expect(page.getByText('Plan Antiguo')).toHaveCount(0);
      await expect(page.getByText('Plan Borrador')).toHaveCount(0);
    });

    test(`US-02-AC-02 highlights the recommended plan (${cc})`, async ({ page }) => {
      await seedStep1(page, cc);
      const recommendedName = RECOMMENDED[cc]; // seed data, SPEC-US-02 AC-02
      await page.goto(`/${cc}/planes`);
      await expect(cards(page).first()).toBeVisible();
      const badges = page.locator('[data-testid="plan-badge"]');
      await expect(badges).toHaveCount(1);
      await expect(badges).toHaveText('Recomendado'); // seed copy "plans.recommendedBadge"
      const recommendedCard = cards(page).filter({ hasText: recommendedName });
      await expect(recommendedCard.locator('[data-testid="plan-badge"]')).toHaveCount(1);
      // Badge is part of that radio's accessible description.
      const radio = page.getByRole('radio', { name: recommendedName, exact: true });
      await expect(radio).toHaveAccessibleDescription(/Recomendado/);
    });

    test(`US-02-AC-03 selects a plan and continues to summary (${cc})`, async ({ page }) => {
      await seedStep1(page, cc);
      await page.goto(`/${cc}/planes`);
      const target = SEED_PLANS[cc][2];
      await expect(cards(page).first()).toBeVisible();
      await expect(continueBtn(page)).toBeDisabled();
      await page.getByRole('radio', { name: target, exact: true }).check();
      await expect(page.getByRole('radio', { name: target, exact: true })).toBeChecked();
      await expect(page.locator('.plan--selected')).toContainText(target);
      await expect(continueBtn(page)).toBeEnabled();
      await continueBtn(page).click();
      await expect(page).toHaveURL(new RegExp(`/${cc}/resumen$`));
    });
  }

  test('US-02-AC-03 selects a plan after completing the real step 1 form (co)', async ({ page }) => {
    await page.goto('/co/datos');
    await expect(page.locator('div.field[data-field="documentNumber"]')).toBeVisible();
    await page.locator('#field-documentType').selectOption('CC');
    await page.locator('#field-documentNumber').fill('1111111111');
    await page.locator('#field-firstName').fill('Ana');
    await page.locator('#field-lastName').fill('Prueba');
    await page.locator('#field-birthDate').fill('1990-01-15');
    await page.locator('#field-email').fill('ana.prueba@example.test');
    await page.locator('#field-phone').fill('3001234567');
    await page.locator('#field-city').selectOption('bogota');
    await page.locator('#field-acceptDataPolicy').check();
    await page.locator('#field-plate').fill('ABC123');
    await page.locator('#field-brand').selectOption('toyota');
    await page.locator('#field-model').fill('Modelo Uno');
    await page.locator('#field-year').fill(String(year));
    await page.locator('#field-mileage').fill('12000');
    await page.locator('button[type=submit]').click();
    await expect(page).toHaveURL(/\/co\/planes$/);
    await page.getByRole('radio', { name: SEED_PLANS['co'][1], exact: true }).check();
    await continueBtn(page).click();
    await expect(page).toHaveURL(/\/co\/resumen$/);
  });

  test('US-02-AC-04 shows empty state when no plans (co, mocked)', async ({ page }) => {
    await seedStep1(page, 'co');
    await page.route('**/api/plans*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], meta: {} }) }),
    );
    await page.goto('/co/planes');
    await expect(page.locator('[data-testid="plans-empty"]')).toBeVisible();
    await expect(page.locator('[data-testid="plans-empty"]')).toHaveText('Por ahora no hay planes disponibles para tu país.');
    await expect(page.getByRole('radio')).toHaveCount(0);
    await expect(continueBtn(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Volver' })).toBeVisible();
  });

  test('US-02-AC-09 disables continue until a plan is selected (co)', async ({ page }) => {
    await seedStep1(page, 'co');
    await page.goto('/co/planes');
    await expect(cards(page).first()).toBeVisible();
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0);
    await expect(continueBtn(page)).toBeDisabled();
  });

  test('US-02-AC-10 redirects to step 1 without valid data (cl)', async ({ page }) => {
    const planRequests: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/api/plans')) planRequests.push(r.url());
    });
    await page.goto('/cl/planes'); // fresh context: empty sessionStorage
    await expect(page).toHaveURL(/\/cl\/datos$/);
    await page.waitForLoadState('networkidle');
    expect(planRequests).toEqual([]);
  });

  test('US-02-AC-19 public write to plans is denied with 401 or 403', async ({ request }) => {
    const denied = [401, 403];
    const planId: string = (await (await request.get('/api/plans?pagination[pageSize]=1')).json()).data[0].documentId;
    const payload = { data: { name: 'hacked' } };
    expect(denied).toContain((await request.post('/api/plans', { data: payload })).status());
    expect(denied).toContain((await request.put(`/api/plans/${planId}`, { data: payload })).status());
    expect(denied).toContain((await request.delete(`/api/plans/${planId}`)).status());
    expect((await request.get('/api/plans')).status()).toBe(200);
  });
});
