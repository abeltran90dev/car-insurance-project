import { expect, test } from '@playwright/test';

test('scaffold: country picker loads', async ({ page }) => {
  await page.goto('/');
  // One link per Strapi country; labels come from the CMS, so assert on the route shape only.
  const links = page.locator('main a[href^="/"]');
  await expect(links.first()).toBeVisible();
  expect(await links.count()).toBeGreaterThan(0);
});
