import { test, expect } from '@playwright/test';

test('Trending navigation, time/language links and direct routes work on both layouts', async ({ page }, testInfo) => {
  await page.goto('/');
  if (testInfo.project.name === 'mobile') await page.locator('.mobile-menu summary').click();
  const navigation = page.getByRole('navigation', { name: testInfo.project.name === 'mobile' ? 'Mobile navigation' : 'Main navigation', exact: true });
  await navigation.getByRole('link', { name: 'Trending', exact: true }).click();
  await expect(page).toHaveURL('/trending/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trending repositories');
  await page.screenshot({ path: `reports/${testInfo.project.name}-trending.png`, fullPage: false });
  await page.getByRole('navigation', { name: 'Trending time range' }).getByRole('link', { name: 'Last 7 days' }).click();
  await page.getByRole('navigation', { name: 'Trending language' }).getByRole('link', { name: 'C++', exact: true }).click();
  await expect(page).toHaveURL('/trending/weekly/cpp/'); await page.reload();
  await expect(page.locator('[data-trending-page]')).toHaveAttribute('data-language', 'cpp');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('rendered ranking matches published data and structured data in every view', async ({ page, request }) => {
  const response = await request.get('/data/trending.json'); expect(response.status()).toBe(200);
  const snapshot = await response.json();
  const production = (await (await request.get('/robots.txt')).text()).includes('Allow: /');
  const languages = { all: null, python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript', rust: 'Rust', go: 'Go', java: 'Java', cpp: 'C++' };
  for (const period of ['daily', 'weekly', 'monthly']) for (const [language, primary] of Object.entries(languages)) {
    const url = period === 'daily' && language === 'all' ? '/trending/' : `/trending/${period}/${language}/`;
    await page.goto(url);
    if (!snapshot) {
      await expect(page.locator('[data-trending-unavailable]')).toBeVisible();
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
      continue;
    }
    const expected = snapshot.repositories.filter((r: any) => r.gains[period] > 0 && (!primary || r.language?.toLowerCase() === primary.toLowerCase()))
      .sort((a: any, b: any) => b.gains[period] - a.gains[period] || b.stars - a.stars || (a.key.toLowerCase() < b.key.toLowerCase() ? -1 : 1)).slice(0, 25);
    const links = page.locator('[data-trending-repository] h2 a');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', production && url === '/trending/' && expected.length > 0 ? 'index,follow' : 'noindex,follow');
    expect(await links.evaluateAll(elements => elements.map(el => el.getAttribute('href')))).toEqual(expected.map((r: any) => `https://github.com/${r.key}`));
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    const collection = schemas.map(text => JSON.parse(text)).find(schema => schema['@type'] === 'CollectionPage');
    expect(collection.mainEntity.itemListElement.map((item: any) => item.url)).toEqual(expected.map((r: any) => `https://github.com/${r.key}`));
    if (!expected.length) await expect(page.locator('[data-trending-empty]')).toBeVisible();
  }
});

test('Trending works without JavaScript and catalog links exist only for curated repositories', async ({ browser, baseURL, request }) => {
  const snapshot = await (await request.get('/data/trending.json')).json();
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage(); await page.goto(baseURL + '/trending/');
    await page.getByRole('navigation', { name: 'Trending time range' }).getByRole('link', { name: 'Last 30 days' }).click();
    await expect(page).toHaveURL(/\/trending\/monthly\/all\//);
    if (snapshot) {
      await expect(page.locator('[data-trending-repository]')).not.toHaveCount(0);
      for (const href of await page.getByRole('link', { name: 'In our catalog' }).evaluateAll(elements => elements.map(el => el.getAttribute('href')!)))
        expect((await request.get(href)).status()).toBe(200);
    } else await expect(page.locator('[data-trending-unavailable]')).toBeVisible();
  } finally { await context.close(); }
});

test('static snapshots display a stale notice as they age', async ({ page, request }) => {
  const snapshot = await (await request.get('/data/trending.json')).json();
  test.skip(!snapshot, 'No snapshot in this offline build');
  await page.clock.install({ time: new Date(Date.parse(snapshot.fetchedAt) + 6 * 3600000) });
  await page.goto('/trending/');
  await expect(page.locator('[data-trending-stale]')).toBeHidden();
  await page.clock.fastForward(7 * 3600000);
  await expect(page.locator('[data-trending-stale]')).toBeVisible();
});

test('unknown Trending filters return a real 404', async ({ request }) => {
  for (const url of ['/trending/yearly/all/', '/trending/weekly/unknown/', '/trending/daily/all/'])
    expect((await request.get(url)).status()).toBe(404);
});
