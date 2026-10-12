import { expect, Page, test } from '@playwright/test';

const start = async (page: Page, name = 'Daily Code') => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'What are we showing up for?' })).toBeVisible();
  await page.getByLabel('Your core habit').fill(name);
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByTestId('habit-name')).toHaveText(name);
};

const hold = async (page: Page, ms: number) => {
  const box = (await page.getByTestId('hold-button').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
};

test('onboarding, early release cancels, full hold logs once, survives refresh', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await start(page);
  await hold(page, 400);
  await page.mouse.up();
  await expect(page.getByTestId('hold-button')).toHaveAttribute('data-state', 'idle');
  await expect(page.getByTestId('log-button')).toBeVisible(); // not logged

  await hold(page, 1400);
  await page.mouse.up();
  await expect(page.getByTestId('hold-button')).toHaveAttribute('data-state', 'done');
  await expect(page.getByTestId('streak-count')).toHaveText('1');
  await expect(page.getByTestId('log-button')).toHaveCount(0);

  await hold(page, 1300); // holding again after completion must not double-log
  await page.mouse.up();
  await page.reload();
  await expect(page.getByTestId('hold-button')).toHaveAttribute('data-state', 'done');
  await expect(page.getByTestId('streak-count')).toHaveText('1');
  await page.goto('/insights');
  await expect(page.getByTestId('stat-total')).toHaveText('1');
  await expect(page.getByTestId('stat-current')).toHaveText('1');
  await expect(page.getByTestId('stat-rate')).toHaveText('100%');
  expect(errors).toEqual([]);
});

test('keyboard alternative: Log today button', async ({ page }) => {
  await start(page, 'Read 10 Pages');
  await page.getByTestId('log-button').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('hold-button')).toHaveAttribute('data-state', 'done');
});

test('keyboard hold on the ring itself', async ({ page }) => {
  await start(page);
  await page.getByTestId('hold-button').focus();
  await page.keyboard.down('Space');
  await page.waitForTimeout(1400);
  await page.keyboard.up('Space');
  await expect(page.getByTestId('hold-button')).toHaveAttribute('data-state', 'done');
});

test('free tier: second habit routes to paywall; tampering storage cannot grant Pro', async ({ page }) => {
  await start(page);
  await page.goto('/habits');
  await page.getByPlaceholder('Add another habit').fill('Second');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page).toHaveURL(/\/pro$/);
  for (const p of ['₹49', '₹199', '₹399']) await expect(page.getByText(p)).toBeVisible();
  await expect(page.getByTestId('buy')).toBeDisabled();
  await expect(page.getByTestId('dev-pro')).toHaveCount(0); // production build: no dev toggle

  await page.evaluate(() => {
    localStorage.setItem('streaks-web-v1', JSON.stringify({ state: { isPro: true }, version: 1 }));
    localStorage.setItem('isPro', 'true');
  });
  await page.goto('/habits');
  await page.getByPlaceholder('Add another habit').fill('Second');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page).toHaveURL(/\/pro$/);
  await expect(page.getByRole('status').filter({ hasText: 'Pro is active' })).toHaveCount(0);
});

test('rename and delete with confirmation', async ({ page }) => {
  await start(page);
  await page.goto('/habits');
  await page.getByRole('button', { name: 'Rename' }).click();
  await page.getByLabel('Habit name').fill('Renamed');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByTestId('habit-row')).toContainText('Renamed');
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Cancel' }).last().click();
  await expect(page.getByTestId('habit-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByTestId('confirm-delete').click();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'What are we showing up for?' })).toBeVisible();
});

test('offline: logging works, banner shows, data persists', async ({ page, context }) => {
  await start(page);
  await context.setOffline(true);
  await expect(page.getByTestId('banner')).toContainText('Offline');
  await page.getByTestId('log-button').click();
  await expect(page.getByTestId('hold-button')).toHaveAttribute('data-state', 'done');
  await context.setOffline(false);
  await expect(page.getByTestId('banner')).toHaveCount(0);
});

test('account page without Firebase config degrades to guest mode; no console errors', async ({ page }) => {
  const errs: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await start(page);
  await page.goto('/account');
  await expect(page.getByTestId('not-configured')).toBeVisible();
  expect(errs).toEqual([]);
});

test('no horizontal overflow on narrow screens', async ({ page }) => {
  await start(page);
  for (const path of ['/', '/insights', '/habits', '/pro', '/account']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow, path).toBe(false);
  }
});
