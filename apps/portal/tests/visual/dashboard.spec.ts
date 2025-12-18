import { test, expect } from '@playwright/test';

test.describe('Dashboard visual guards', () => {
  test('light mode: particles exist and are blue-ish', async ({ page }) => {
    await page.goto('/dashboard?testMode=1');
    // Force light theme for deterministic snapshot
    await page.evaluate(() => document.documentElement.classList.add('light'));
    await page.waitForSelector('.background-particles', { state: 'attached', timeout: 20000 });

    const particles = await page.$$eval('.background-particles .particle', els => els.map(el => {
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { bg: s.backgroundImage || '', opacity: parseFloat(s.opacity || '0'), w: r.width, h: r.height };
    }));

    expect(particles.length).toBeGreaterThanOrEqual(4);
    const hasBlue = particles.some(p => /96,165,250|99,102,241|60a5fa|59,130,246/.test(p.bg));
    expect(hasBlue).toBeTruthy();

    // Save a screenshot artifact for review (CI will upload it)
    await page.locator('.dashboard-redesign').screenshot({ path: 'test-results/dashboard-light.png' });
  });

  test('dark mode: particles visible and strong', async ({ page }) => {
    await page.goto('/dashboard?testMode=1');
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForSelector('.background-particles', { state: 'attached', timeout: 20000 });

    const particles = await page.$$eval('.background-particles .particle', els => els.map(el => {
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { bg: s.backgroundImage || '', opacity: parseFloat(s.opacity || '0'), w: r.width, h: r.height };
    }));

    expect(particles.length).toBeGreaterThanOrEqual(2);
    const visible = particles.some(p => p.opacity >= 0.7 && p.w > 12 && p.h > 12);
    expect(visible).toBeTruthy();

    await page.locator('.dashboard-redesign').screenshot({ path: 'test-results/dashboard-dark.png' });
  });
});
