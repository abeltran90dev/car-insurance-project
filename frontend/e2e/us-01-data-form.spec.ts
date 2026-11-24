import { expect, test } from '@playwright/test';

test.describe('US-01 step 1 (e2e)', () => {
  test('US-01-AC-04 keeps step 1 data when going back', async ({ page }) => {
    await page.goto('/co/datos');
    await expect(page.locator('div.field[data-field="documentNumber"]')).toBeVisible();

    const year = String(new Date().getFullYear() - 2);
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
    await page.locator('#field-year').fill(year);
    await page.locator('#field-mileage').fill('12000');

    await page.locator('button[type=submit]').click();
    await expect(page).toHaveURL(/\/co\/planes$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/co\/datos$/);
    await expect(page.locator('#field-firstName')).toHaveValue('Ana');
    await expect(page.locator('#field-documentNumber')).toHaveValue('1111111111');
    await expect(page.locator('#field-documentType')).toHaveValue('CC');
    await expect(page.locator('#field-birthDate')).toHaveValue('1990-01-15');
    await expect(page.locator('#field-acceptDataPolicy')).toBeChecked();
    await expect(page.locator('#field-year')).toHaveValue(year);
  });

  test('US-01-AC-12 completes step 1 with keyboard only', async ({ page }) => {
    await page.goto('/co/datos');
    await expect(page.locator('div.field[data-field="documentNumber"]')).toBeVisible();

    const year = String(new Date().getFullYear() - 2);
    const activeId = () => page.evaluate(() => document.activeElement?.id ?? '');
    // Press Tab until the expected control has focus (fails if a field is unreachable or out of order).
    const focusField = async (key: string) => {
      for (let i = 0; i < 40; i++) {
        if ((await activeId()) === `field-${key}`) {
          return;
        }
        await page.keyboard.press('Tab');
      }
      throw new Error(`field-${key} not reachable with Tab`);
    };

    await focusField('documentType');
    await page.keyboard.press('ArrowDown'); // first real option
    await focusField('documentNumber');
    await page.keyboard.type('1111111111');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Ana');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Prueba');
    await page.keyboard.press('Tab');
    expect(await activeId()).toBe('field-birthDate');
    await page.keyboard.type('01151990'); // mm/dd/yyyy segments (Chromium en-US)
    await focusField('email'); // the date control has several internal tab stops
    await page.keyboard.type('ana.prueba@example.test');
    await page.keyboard.press('Tab');
    await page.keyboard.type('3001234567');
    await focusField('city');
    await page.keyboard.press('ArrowDown');
    await focusField('acceptDataPolicy');
    await page.keyboard.press('Space');
    await focusField('plate');
    await page.keyboard.type('ABC123');
    await focusField('brand');
    await page.keyboard.press('ArrowDown');
    await focusField('model');
    await page.keyboard.type('Modelo Uno');
    await page.keyboard.press('Tab');
    expect(await activeId()).toBe('field-year');
    await page.keyboard.type(year);
    await page.keyboard.press('Tab');
    await page.keyboard.type('12000');

    await page.keyboard.press('Tab');
    await expect(page.locator('button[type=submit]')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/co\/planes$/);
  });

  for (const cc of ['co', 'cl']) {
    test(`US-01-AC-05 hides unpublished fields (${cc})`, async ({ page, request }) => {
      // Seed data: one draft field "draftOnlyField" per country.
      await page.goto(`/${cc}/datos`);
      await expect(page.locator('div.field').first()).toBeVisible();
      await expect(page.locator('div.field[data-field="draftOnlyField"]')).toHaveCount(0);
      const api = await request.get(
        `/api/form-fields?filters[country][code][$eq]=${cc.toUpperCase()}&pagination[pageSize]=100`,
      );
      const body = await api.json();
      expect(body.data.map((f: { key: string }) => f.key)).not.toContain('draftOnlyField');
    });
  }

  test('US-01-AC-22 lists countries from Strapi on the picker', async ({ page, request }) => {
    const countries = (await (await request.get('/api/countries?sort=name:asc&pagination[pageSize]=100')).json())
      .data as Array<{ code: string; name: string }>;
    expect(countries.length).toBeGreaterThanOrEqual(2);
    await page.goto('/');
    for (const c of countries) {
      const link = page.getByRole('link', { name: c.name, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', `/${c.code.toLowerCase()}`);
    }
    const chile = countries.find((c) => c.code === 'CL')!;
    await page.getByRole('link', { name: chile.name, exact: true }).click();
    await expect(page).toHaveURL(/\/cl\/datos$/);
  });

  test('US-01-AC-23 shows not-found for unknown country code', async ({ page }) => {
    const formFieldRequests: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/api/form-fields')) {
        formFieldRequests.push(r.url());
      }
    });
    await page.goto('/zz/datos');
    await expect(page.locator('a[href="/"]')).toBeVisible();
    await expect(page.locator('form')).toHaveCount(0);
    await page.waitForLoadState('networkidle');
    expect(formFieldRequests).toEqual([]);
  });

  test('US-01-AC-15 public write to form-fields, countries and site-copy is denied', async ({ request }) => {
    const denied = [401, 403];
    const fieldId = (await (await request.get('/api/form-fields?pagination[pageSize]=1')).json()).data[0].documentId;
    const countryId = (await (await request.get('/api/countries?pagination[pageSize]=1')).json()).data[0].documentId;
    const payload = { data: { key: 'hacked' } };

    expect(denied).toContain((await request.post('/api/form-fields', { data: payload })).status());
    expect(denied).toContain((await request.put(`/api/form-fields/${fieldId}`, { data: payload })).status());
    expect(denied).toContain((await request.delete(`/api/form-fields/${fieldId}`)).status());

    expect(denied).toContain((await request.post('/api/countries', { data: payload })).status());
    expect(denied).toContain((await request.put(`/api/countries/${countryId}`, { data: payload })).status());
    expect(denied).toContain((await request.delete(`/api/countries/${countryId}`)).status());

    expect(denied).toContain((await request.put('/api/site-copy', { data: payload })).status());
    expect(denied).toContain((await request.delete('/api/site-copy')).status());

    for (const path of ['/api/form-fields', '/api/countries', '/api/site-copy']) {
      expect((await request.get(path)).status()).toBe(200);
    }
  });
});
