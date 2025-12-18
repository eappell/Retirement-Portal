const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/dashboard?testMode=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const html = await page.evaluate(() => document.body.innerHTML);
  console.log(html.slice(0, 5000));
  await browser.close();
})();
