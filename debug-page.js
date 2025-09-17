import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // 監聽控制台訊息
  page.on('console', msg => {
    console.log(`[CONSOLE ${msg.type()}]: ${msg.text()}`);
  });

  // 監聽錯誤
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR]: ${error.message}`);
  });

  // 監聽網路請求
  page.on('response', response => {
    console.log(`[NETWORK]: ${response.status()} ${response.url()}`);
  });

  try {
    console.log('正在訪問 http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // 等待一下讓頁面完全載入
    await page.waitForTimeout(3000);
    
    // 獲取頁面標題
    const title = await page.title();
    console.log(`頁面標題: ${title}`);
    
    // 獲取頁面內容
    const content = await page.content();
    console.log('頁面 HTML 長度:', content.length);
    
    // 檢查是否有 #app 元素
    const appElement = await page.$('#app');
    if (appElement) {
      const appContent = await appElement.innerHTML();
      console.log('App 元素內容長度:', appContent.length);
      console.log('App 元素前 500 字符:', appContent.substring(0, 500));
    } else {
      console.log('找不到 #app 元素');
    }

    // 檢查是否有錯誤元素
    const errorElements = await page.$$('*:contains("錯誤"), *:contains("失敗"), *:contains("Error")');
    console.log('找到錯誤元素數量:', errorElements.length);
    
    // 截圖
    await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
    console.log('已保存截圖到 debug-screenshot.png');
    
  } catch (error) {
    console.error('發生錯誤:', error);
  }

  await browser.close();
})();