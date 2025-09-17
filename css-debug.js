import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // 檢查 CSS 檔案是否載入
    const stylesheets = await page.evaluate(() => {
      const sheets = [];
      for (let i = 0; i < document.styleSheets.length; i++) {
        const sheet = document.styleSheets[i];
        sheets.push({
          href: sheet.href,
          title: sheet.title,
          rulesCount: sheet.cssRules ? sheet.cssRules.length : 0
        });
      }
      return sheets;
    });
    
    console.log('🎨 載入的 CSS 檔案:');
    stylesheets.forEach((sheet, index) => {
      console.log(`${index + 1}. ${sheet.href || '內聯樣式'} (${sheet.rulesCount} 規則)`);
    });
    
    // 檢查是否有 Tailwind 的基本樣式
    const hasTailwindReset = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      for (let el of elements) {
        const computed = getComputedStyle(el);
        if (computed.boxSizing === 'border-box') {
          return true;
        }
      }
      return false;
    });
    
    console.log(`📦 Tailwind CSS Reset: ${hasTailwindReset ? '✅ 已載入' : '❌ 未載入'}`);
    
    // 檢查特定元素的 Tailwind 類別是否生效
    const testElement = await page.evaluate(() => {
      const aside = document.querySelector('aside');
      if (!aside) return null;
      
      const computed = getComputedStyle(aside);
      return {
        backgroundColor: computed.backgroundColor,
        width: computed.width,
        boxShadow: computed.boxShadow,
        classes: aside.className
      };
    });
    
    console.log('🔍 側邊欄樣式測試:', testElement);
    
    // 強制添加一些內聯樣式來測試
    await page.evaluate(() => {
      const app = document.getElementById('app');
      if (app) {
        app.style.border = '2px solid red';
        app.style.minHeight = '100vh';
      }
      
      const aside = document.querySelector('aside');
      if (aside) {
        aside.style.backgroundColor = '#ffffff';
        aside.style.width = '256px';
        aside.style.height = '100vh';
        aside.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
      }
      
      const main = document.querySelector('main');
      if (main) {
        main.style.backgroundColor = '#f9fafb';
        main.style.flex = '1';
      }
    });
    
    console.log('✅ 已添加強制樣式，請檢查頁面');
    
  } catch (error) {
    console.error('❌ CSS 檢查失敗:', error.message);
  }

  await browser.close();
})();