const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // 設定手機視窗 (iPhone 12 Pro)
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  
  // 訪問網站
  await page.goto('https://3000-imkpd7a2pfulprwosk40w-90e1fb62.manus-asia.computer', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });
  
  // 等待頁面載入
  await page.waitForTimeout(2000);
  
  // 截圖首頁
  await page.screenshot({ 
    path: '/home/ubuntu/mobile_home_view.png',
    fullPage: true 
  });
  
  console.log('Mobile view screenshot saved to /home/ubuntu/mobile_home_view.png');
  
  await browser.close();
})();
