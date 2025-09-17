import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🌐 正在訪問 http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    console.log('📸 準備截圖...');
    await page.screenshot({ path: 'current-page.png', fullPage: true });
    console.log('✅ 截圖已保存為 current-page.png');
    
    // 檢查頁面基本信息
    const title = await page.title();
    console.log(`📄 頁面標題: ${title}`);
    
    // 檢查 body 背景色
    const bodyBgColor = await page.$eval('body', el => getComputedStyle(el).backgroundColor);
    console.log(`🎨 Body 背景色: ${bodyBgColor}`);
    
    // 檢查是否有文字內容
    const textContent = await page.evaluate(() => document.body.innerText);
    console.log(`📝 頁面文字長度: ${textContent.length}`);
    console.log(`📝 頁面前100個字符: ${textContent.substring(0, 100)}`);
    
    // 檢查CSS載入
    const stylesheetCount = await page.evaluate(() => document.styleSheets.length);
    console.log(`🎭 載入的樣式表數量: ${stylesheetCount}`);
    
    // 檢查特定元素
    const hasApp = await page.$('#app');
    const hasAside = await page.$('aside');
    const hasMain = await page.$('main');
    const hasNav = await page.$('nav');
    
    console.log('🔍 元素檢查:');
    console.log(`  #app 元素: ${hasApp ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`  aside 元素: ${hasAside ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`  main 元素: ${hasMain ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`  nav 元素: ${hasNav ? '✅ 存在' : '❌ 不存在'}`);
    
    // 檢查是否有錯誤
    console.log('\n🚨 檢查控制台錯誤...');
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ 控制台錯誤: ${msg.text()}`);
      }
    });
    
    console.log('\n⏳ 保持瀏覽器打開10秒供檢查...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ 檢查失敗:', error);
  } finally {
    await browser.close();
  }
})();