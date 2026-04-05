const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:4200', { waitUntil: 'networkidle' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('http://localhost:4200', { waitUntil: 'networkidle' });
  
  await page.locator('input[type="email"], input[name="email"]').fill('admin@example.com');
  await page.locator('input[type="password"]').fill('password123');
  await page.locator('button[type="submit"]').click();
  
  await page.waitForURL(/\/(dashboard|workflows)/, { timeout: 10000 });
  console.log('Logged in');
  
  await page.goto('http://localhost:4200/workflow-instance/9d34a940-0a65-464f-98e1-64b76c48235b', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  console.log('URL:', page.url());
  const html = await page.innerHTML('app-root');
  console.log('app-root innerHTML length:', html.length);
  console.log('Contains detail-header:', html.includes('detail-header'));
  console.log('Contains loading:', html.includes('loading'));
  console.log('Contains not-found:', html.includes('not-found'));
  
  await browser.close();
})();
