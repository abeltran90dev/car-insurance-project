import { APIRequestContext, expect, Page, test } from '@playwright/test';

// Plan names are seed data (SPEC-US-03 AC-01 / AC-07 examples).
const PLAN: Record<string, string> = { co: 'Plan Estándar', cl: 'Plan Full' };
const CURRENCY_DIGITS = (s: string) => s.replace(/\D/g, '');

const year = new Date().getFullYear() - 2; // vehicle age 2: no surcharge (SPEC-US-02 AC-05)

// Fictitious step 1 values per country (keys come from the seeded form configuration).
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

interface PlanInfo {
  documentId: string;
  basePrice: number;
}

async function planInfo(request: APIRequestContext, cc: string): Promise<PlanInfo> {
  const res = await request.get('/api/plans', {
    params: {
      'filters[country][code][$eq]': cc.toUpperCase(),
      'filters[name][$eq]': PLAN[cc],
    },
  });
  return (await res.json()).data[0] as PlanInfo;
}

/** Seeds the ADR-004 storage shape before the app boots (only if nothing is stored yet). */
async function seedState(page: Page, cc: string, planDocumentId: string | null, values = STEP1[cc]) {
  const key = `quote:v1:${cc.toUpperCase()}`;
  const value = JSON.stringify({ v: 1, country: cc.toUpperCase(), values, planDocumentId });
  await page.addInitScript(
    ([k, v]) => {
      if (sessionStorage.getItem(k) === null) sessionStorage.setItem(k, v);
    },
    [key, value],
  );
}

async function openSummary(page: Page, request: APIRequestContext, cc: string) {
  await seedState(page, cc, (await planInfo(request, cc)).documentId);
  await page.goto(`/${cc}/resumen`);
  await expect(page.getByTestId('summary-plan-name')).toBeVisible();
}

const payButton = (page: Page) => page.getByRole('button', { name: 'Pagar', exact: true });
const terms = (page: Page) => page.getByRole('checkbox', { name: 'Acepto los términos y condiciones' });

async function openGateway(page: Page) {
  await terms(page).check();
  await payButton(page).click();
  await expect(page.getByTestId('gateway')).toBeVisible();
}

test.describe('US-03 summary and payment (e2e)', () => {
  for (const cc of ['co', 'cl']) {
    const CC = cc.toUpperCase();

    test(`US-03-AC-01 summary shows policyholder, vehicle and plan with final price (${cc})`, async ({ page, request }) => {
      const plan = await planInfo(request, cc);
      await seedState(page, cc, plan.documentId);
      await page.goto(`/${cc}/resumen`);
      await expect(page.getByTestId('summary-policyholder')).toBeVisible();
      await expect(page.getByTestId('summary-vehicle')).toBeVisible();
      await expect(page.getByTestId('summary-plan-name')).toHaveText(PLAN[cc]);

      // Every published field with a non-empty value has a row (labels come from the Strapi API).
      const api = await (
        await request.get(
          `/api/form-fields?filters[country][code][$eq]=${CC}&pagination[pageSize]=100&populate[0]=options`,
        )
      ).json();
      const expectedFields = (api.data as Array<{ key: string; label: string }>).filter(
        (f) => STEP1[cc][f.key] !== undefined && STEP1[cc][f.key] !== '',
      );
      expect(expectedFields.length).toBeGreaterThan(5);
      for (const f of expectedFields) {
        const row = page.getByTestId(`row-${f.key}`);
        await expect(row, `row for ${f.key}`).toBeVisible();
        await expect(row.locator('dt'), `label for ${f.key}`).toHaveText(f.label.trim());
      }
      // A non-masked field shows its entered value (firstName is plain text in both countries).
      await expect(page.getByTestId('row-firstName').locator('dd')).toHaveText(String(STEP1[cc]['firstName']));
      // Unpublished (draft) fields must not appear on the page.
      await expect(page.getByTestId('row-draftOnlyField')).toHaveCount(0);

      // Price: vehicle age 2 -> no surcharge, so final price equals the base price (SPEC-US-02 AC-05).
      const price = page.getByTestId('summary-price');
      expect(CURRENCY_DIGITS(await price.innerText())).toBe(String(plan.basePrice));
      const currency = (await (await request.get(`/api/countries?filters[code][$eq]=${CC}`)).json()).data[0].currency;
      const expected = new Intl.NumberFormat(cc === 'co' ? 'es-CO' : 'es-CL', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(plan.basePrice);
      expect((await price.innerText()).replace(/\s/g, ' ')).toBe(expected.replace(/\s/g, ' '));
    });

    test(`US-03-AC-02 terms from Strapi per country gate the pay button (${cc})`, async ({ page, request }) => {
      const country = (await (await request.get(`/api/countries?filters[code][$eq]=${CC}`)).json()).data[0];
      await openSummary(page, request, cc);
      await expect(page.getByTestId('terms')).toContainText(country.termsTitle);
      await expect(page.getByTestId('terms-body')).toHaveText(country.termsBody.trim(), { useInnerText: true });
      await expect(payButton(page)).toBeDisabled();
      await terms(page).check();
      await expect(payButton(page)).toBeEnabled();
      await terms(page).uncheck();
      await expect(payButton(page)).toBeDisabled();
    });

    test(`US-03-AC-03 approved payment locks controls and shows quote number (${cc})`, async ({ page, request }) => {
      await openSummary(page, request, cc);
      await openGateway(page);
      await page.getByRole('button', { name: 'Simular pago aprobado' }).click();
      await expect(page.getByTestId('payment-processing')).toHaveText('Procesando pago…');
      await expect(page.getByRole('button', { name: 'Simular pago aprobado' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Simular pago rechazado' })).toBeDisabled();
      await expect(payButton(page)).toBeDisabled();
      await expect(page).toHaveURL(new RegExp(`/${cc}/confirmacion$`));
      await expect(page.getByTestId('quote-number')).toHaveText(new RegExp(`^COT-${CC}-\\d{8}-[A-Z0-9]{6}$`));
    });

    test(`US-03-AC-04 rejected payment keeps data and allows retry (${cc})`, async ({ page, request }) => {
      await openSummary(page, request, cc);
      await openGateway(page);
      await page.getByRole('button', { name: 'Simular pago rechazado' }).click();
      const alert = page.getByTestId('payment-rejected');
      await expect(alert).toBeVisible();
      await expect(alert).toHaveText(
        'El pago fue rechazado. No se realizó ningún cobro. Puedes intentarlo de nuevo.', // seed copy payment.rejected
      );
      await expect(page).toHaveURL(new RegExp(`/${cc}/resumen$`));
      await expect(page.getByTestId('summary-plan-name')).toHaveText(PLAN[cc]);
      await expect(page.getByTestId('row-documentNumber')).toBeVisible();
      await expect(terms(page)).toBeChecked();
      await expect(payButton(page)).toBeEnabled();
    });

    test(`US-03-AC-05 masks document leaving last 4 characters (${cc})`, async ({ page, request }) => {
      await openSummary(page, request, cc);
      const shown = cc === 'co' ? '******1111' : '*****1111';
      const entered = String(STEP1[cc]['documentNumber']);
      await expect(page.getByTestId('row-documentNumber')).toContainText(shown);
      const html = await page.content();
      expect(html).not.toContain(entered);
      expect(await page.evaluate(() => document.body.innerText)).not.toContain(entered);
    });

    test(`US-03-AC-06 edit data returns to step 1 with values (${cc})`, async ({ page, request }) => {
      await openSummary(page, request, cc);
      await page.getByRole('button', { name: 'Editar datos' }).click();
      await expect(page).toHaveURL(new RegExp(`/${cc}/datos$`));
      await expect(page.locator('#field-firstName')).toHaveValue(String(STEP1[cc]['firstName']));
      await expect(page.locator('#field-documentNumber')).toHaveValue(String(STEP1[cc]['documentNumber']));
      await expect(page.locator('#field-plate')).toHaveValue(String(STEP1[cc]['plate']));
      await expect(page.locator('#field-year')).toHaveValue(String(year));
      await expect(page.locator('#field-email')).toHaveValue(String(STEP1[cc]['email']));
    });

    test(`US-03-AC-07 change plan preselects current plan (${cc})`, async ({ page, request }) => {
      await openSummary(page, request, cc);
      await page.getByRole('button', { name: 'Cambiar plan' }).click();
      await expect(page).toHaveURL(new RegExp(`/${cc}/planes$`));
      await expect(page.getByRole('radio', { name: PLAN[cc], exact: true })).toBeChecked();
    });
  }

  test('US-03-AC-08 double click produces a single payment', async ({ page, request }) => {
    await openSummary(page, request, 'co');
    await openGateway(page);
    await page.getByRole('button', { name: 'Simular pago aprobado' }).dblclick({ delay: 20 });
    await expect(page).toHaveURL(/\/co\/confirmacion$/);
    await expect(page.getByTestId('quote-number')).toHaveCount(1);
    await expect(page.getByTestId('quote-number')).toHaveText(/^COT-CO-\d{8}-[A-Z0-9]{6}$/);
  });

  test('US-03-AC-10 clears wizard state after approval', async ({ page, request }) => {
    await openSummary(page, request, 'co');
    await openGateway(page);
    await page.getByRole('button', { name: 'Simular pago aprobado' }).click();
    await expect(page).toHaveURL(/\/co\/confirmacion$/);
    await expect(page.getByTestId('quote-number')).toBeVisible();
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('quote:v1:CO'))).toBeNull();
    await page.goBack();
    await expect(page).toHaveURL(/\/co\/datos$/);
    await expect(page.locator('#field-firstName')).toHaveValue('');
    await expect(page.locator('#field-documentNumber')).toHaveValue('');
  });

  test('US-03-AC-11 summary guard redirects to first incomplete step (no wizard state)', async ({ page }) => {
    await page.goto('/cl/resumen');
    await expect(page).toHaveURL(/\/cl\/datos$/);
  });

  test('US-03-AC-11 summary guard redirects to first incomplete step (valid step 1, no plan)', async ({ page }) => {
    await seedState(page, 'cl', null);
    await page.goto('/cl/resumen');
    await expect(page).toHaveURL(/\/cl\/planes$/);
  });

  test('US-03-AC-12 gateway has no card inputs', async ({ page, request }) => {
    await openSummary(page, request, 'co');
    await openGateway(page);
    const gateway = page.getByTestId('gateway');
    await expect(gateway.locator('input, select, textarea')).toHaveCount(0);

    const cardKeys = async () =>
      page.evaluate(() => Object.keys(sessionStorage).concat(Object.keys(localStorage)).filter((k) => /card|cvv|cvc|pan|payment/i.test(k)));
    await page.getByRole('button', { name: 'Simular pago rechazado' }).click();
    await expect(page.getByTestId('payment-rejected')).toBeVisible();
    expect(await cardKeys()).toEqual([]);

    await payButton(page).click();
    await page.getByRole('button', { name: 'Simular pago aprobado' }).click();
    await expect(page).toHaveURL(/\/co\/confirmacion$/);
    expect(await cardKeys()).toEqual([]);
  });

  test('US-03-AC-22 public write to countries is denied with 401 or 403', async ({ request }) => {
    const denied = [401, 403];
    const countryId: string = (await (await request.get('/api/countries?pagination[pageSize]=1')).json()).data[0].documentId;
    const payload = { data: { code: 'ZZ', name: 'hacked' } };
    expect(denied).toContain((await request.post('/api/countries', { data: payload })).status());
    expect(denied).toContain((await request.put(`/api/countries/${countryId}`, { data: payload })).status());
    expect(denied).toContain((await request.delete(`/api/countries/${countryId}`)).status());
    expect((await request.get('/api/countries')).status()).toBe(200);
  });
});
