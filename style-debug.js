import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // 檢查 body 樣式
    const bodyStyles = await page.$eval('body', el => {
      const computed = getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        fontFamily: computed.fontFamily
      };
    });
    console.log('📝 Body 樣式:', bodyStyles);
    
    // 檢查側邊欄樣式
    const sidebarStyles = await page.$eval('aside', el => {
      const computed = getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        width: computed.width,
        height: computed.height
      };
    });
    console.log('📝 側邊欄樣式:', sidebarStyles);
    
    // 檢查主要內容樣式
    const mainStyles = await page.$eval('main', el => {
      const computed = getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        display: computed.display
      };
    });
    console.log('📝 主要內容樣式:', mainStyles);
    
    // 檢查統計卡片樣式
    const cardStyles = await page.$eval('.card', el => {
      const computed = getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        display: computed.display,
        visibility: computed.visibility
      };
    });
    console.log('📝 統計卡片樣式:', cardStyles);
    
    // 檢查文字內容是否存在
    const hasText = await page.evaluate(() => {
      const texts = [];
      const elements = document.querySelectorAll('*');
      elements.forEach(el => {
        if (el.textContent && el.textContent.trim().length > 0) {
          texts.push(el.textContent.trim().substring(0, 30));
        }
      });
      return texts.slice(0, 10); // 前10個有文字的元素
    });
    console.log('📝 頁面文字內容樣本:', hasText);
    
  } catch (error) {
    console.error('❌ 樣式檢查失敗:', error.message);
  }

  await browser.close();
})();