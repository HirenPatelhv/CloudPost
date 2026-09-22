const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8080/index.html');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshot.png' });
  const content = await page.content();
  require('fs').writeFileSync('dom.html', content);
  await browser.close();
})();
