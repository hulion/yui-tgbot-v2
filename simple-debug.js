import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // 監聽控制台錯誤
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`❌ 控制台錯誤: ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    console.log(`❌ 頁面錯誤: ${error.message}`);
  });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // 檢查具體元素
    const hasNav = await page.$('nav');
    const hasHeader = await page.$('header');  
    const hasMain = await page.$('main');
    const hasStatCards = await page.$$('.stat-card, .card');
    
    console.log('🔍 頁面元素檢查:');
    console.log(`導航欄: ${hasNav ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`頁首: ${hasHeader ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`主要內容: ${hasMain ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`統計卡片數量: ${hasStatCards.length}`);
    
    // 檢查是否有「載入中」狀態
    const loadingElements = await page.$$('text=載入中');
    const spinnerElements = await page.$$('.spinner, .animate-spin');
    console.log(`載入中元素: ${loadingElements.length}`);
    console.log(`載入動畫: ${spinnerElements.length}`);
    
    // 檢查 App 的 opacity 樣式
    const appOpacity = await page.$eval('#app', el => getComputedStyle(el).opacity);
    console.log(`App 元素透明度: ${appOpacity}`);
    
    // 檢查是否有 loaded 類別
    const hasLoadedClass = await page.$eval('#app', el => el.classList.contains('loaded'));
    console.log(`App 有 loaded 類別: ${hasLoadedClass}`);
    
  } catch (error) {
    console.error('❌ 檢查失敗:', error.message);
  }

  await browser.close();
})();