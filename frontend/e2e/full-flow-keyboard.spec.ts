import { expect, Page, test } from '@playwright/test';

/** Keyboard-only helpers: no mouse, no click(), no fill(). */
const activeInfo = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return {
      id: el?.id ?? '',
      tag: el?.tagName ?? '',
      type: (el as HTMLInputElement | null)?.type ?? '',
      testid: el?.getAttribute('data-testid') ?? '',
      text: (el?.textContent ?? '').trim(),
      checked: (el as HTMLInputElement | null)?.checked ?? false,
    };
  });

/** Presses Tab until the predicate matches the focused element (fails if unreachable). */
async function tabTo(page: Page, label: string, match: (a: Awaited<ReturnType<typeof activeInfo>>) => boolean) {
  for (let i = 0; i < 40; i++) {
    if (match(await activeInfo(page))) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`${label} not reachable with Tab`);
}

const button = (text: string) => (a: Awaited<ReturnType<typeof activeInfo>>) => a.tag === 'BUTTON' && a.text === text;

// BUG: TW-BUG-01 (summary guard breaks step 2 -> step 3)
test('US-01-AC-12 US-03-AC-20 completes the full Colombia flow with keyboard only', async ({ page }) => {
  const year = String(new Date().getFullYear() - 2);

  // Step 1 (same keyboard sequence as the US-01 test).
  await page.goto('/co/datos');
  await expect(page.locator('div.field[data-field="documentNumber"]')).toBeVisible();
  const focusField = (key: string) => tabTo(page, `field-${key}`, (a) => a.id === `field-${key}`);

  await focusField('documentType');
  await page.keyboard.press('ArrowDown');
  await focusField('documentNumber');
  await page.keyboard.type('1111111111');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Ana');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Prueba');
  await page.keyboard.press('Tab');
  await page.keyboard.type('01151990'); // mm/dd/yyyy segments (Chromium en-US)
  await focusField('email');
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
  await page.keyboard.type(year);
  await page.keyboard.press('Tab');
  await page.keyboard.type('12000');
  await page.keyboard.press('Tab');
  await expect(page.locator('button[type=submit]')).toBeFocused();
  await page.keyboard.press('Enter');

  // Step 2: plans. Tab into the radio group, ArrowDown to the 2nd plan, then Continue.
  await expect(page).toHaveURL(/\/co\/planes$/);
  await expect(page.getByRole('radio').first()).toBeVisible();
  await tabTo(page, 'plan radio', (a) => a.tag === 'INPUT' && a.type === 'radio');
  await page.keyboard.press('ArrowDown');
  const chosen = await page.getByRole('radio', { checked: true }).evaluate((el) => (el as HTMLInputElement).id);
  expect(chosen).not.toBe('');
  const chosenName = await page.locator(`label[for="${chosen}"], label:has(#${chosen})`).first().innerText().catch(() => '');
  await tabTo(page, 'Continuar', (a) => a.tag === 'BUTTON' && !(a as { text: string }).text.includes('Volver') && a.text.length > 0 && a.id === '' && a.text !== 'Volver');
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeFocused();
  await page.keyboard.press('Enter');

  // Step 3: summary. Focus starts on the h1.
  await expect(page).toHaveURL(/\/co\/resumen$/);
  await expect(page.getByTestId('summary-plan-name')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  void chosenName;

  await tabTo(page, 'terms checkbox', (a) => a.id === 'terms-accept');
  await page.keyboard.press('Space');
  await expect(page.getByRole('checkbox', { name: 'Acepto los términos y condiciones' })).toBeChecked();

  await tabTo(page, 'Pagar', button('Pagar'));
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('gateway')).toBeVisible();
  await expect(page.locator('#gateway-title')).toBeFocused(); // focus moves to gateway heading

  await tabTo(page, 'Simular pago aprobado', button('Simular pago aprobado'));
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('payment-processing')).toBeVisible();

  // Confirmation: h1 focused, quote number shown.
  await expect(page).toHaveURL(/\/co\/confirmacion$/);
  await expect(page.getByTestId('quote-number')).toHaveText(/^COT-CO-\d{8}-[A-Z0-9]{6}$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
});
