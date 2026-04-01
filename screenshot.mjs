import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });
  
  await page.goto('https://miluan1995.github.io/mahjong-arena/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/tmp/mahjong-desktop.png', fullPage: true });
  
  const mobilePage = await browser.newPage({
    viewport: { width: 375, height: 812 }
  });
  await mobilePage.goto('https://miluan1995.github.io/mahjong-arena/', { waitUntil: 'networkidle' });
  await mobilePage.screenshot({ path: '/tmp/mahjong-mobile.png', fullPage: true });
  
  await browser.close();
  console.log('✅ Screenshots saved');
})();
